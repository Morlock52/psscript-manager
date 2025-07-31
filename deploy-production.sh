#!/bin/bash

# PSScript Production Deployment Script
# This script handles the complete production deployment of PSScript

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="psscript"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.prod"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking system requirements..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    # Set compose command
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
    
    log_success "System requirements met"
}

check_env_file() {
    log_info "Checking environment configuration..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        log_warning "Production environment file $ENV_FILE not found"
        log_info "Creating $ENV_FILE from template..."
        
        cat > "$ENV_FILE" << EOF
# Production Environment Configuration
NODE_ENV=production

# Database Configuration
POSTGRES_DB=psscript_prod
POSTGRES_USER=psscript_user
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d '=' | cut -c1-25)

# Redis Configuration  
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d '=' | cut -c1-25)

# JWT Configuration
JWT_SECRET=$(openssl rand -base64 64 | tr -d '=' | cut -c1-50)
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '=' | cut -c1-50)
SESSION_SECRET=$(openssl rand -base64 64 | tr -d '=' | cut -c1-50)

# API Keys (MUST BE SET MANUALLY)
OPENAI_API_KEY=your_openai_api_key_here

# Domain Configuration
CORS_ORIGIN=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
FRONTEND_API_URL=https://yourdomain.com/api

# Monitoring
GRAFANA_ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -d '=' | cut -c1-25)

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_EXTENSIONS=.ps1,.psm1,.psd1
EOF
        
        log_warning "Created $ENV_FILE with generated secrets"
        log_warning "IMPORTANT: You must update OPENAI_API_KEY and domain settings in $ENV_FILE"
        log_info "Edit $ENV_FILE and update the required values, then run this script again"
        exit 1
    fi
    
    # Check if critical values are set
    source "$ENV_FILE"
    
    if [[ "$OPENAI_API_KEY" == "your_openai_api_key_here" ]]; then
        log_error "OPENAI_API_KEY is not set in $ENV_FILE"
        log_info "Please update $ENV_FILE with your OpenAI API key"
        exit 1
    fi
    
    log_success "Environment configuration validated"
}

build_images() {
    log_info "Building production Docker images..."
    
    # Build all services
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache
    
    log_success "Docker images built successfully"
}

setup_directories() {
    log_info "Setting up required directories..."
    
    # Create observability configuration directories
    mkdir -p observability/{prometheus/{alerts},grafana/{provisioning/{dashboards,datasources},dashboards},alertmanager,loki,promtail}
    mkdir -p nginx/ssl
    mkdir -p logs
    
    log_success "Directories created"
}

create_monitoring_configs() {
    log_info "Creating monitoring configurations..."
    
    # Prometheus configuration
    cat > observability/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerts/*.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'psscript-backend'
    static_configs:
      - targets: ['backend:4000']
    metrics_path: '/api/metrics'

  - job_name: 'nginx'
    static_configs:
      - targets: ['nginx:8080']
    metrics_path: '/nginx_status'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:5432']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:6379']

  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8888']
EOF

    # Basic alerting rules
    cat > observability/prometheus/alerts/psscript-alerts.yml << 'EOF'
groups:
  - name: psscript-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is above 10% for 5 minutes"

      - alert: HighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High response time"
          description: "95th percentile response time is above 2 seconds"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Service is down"
          description: "{{ $labels.instance }} of job {{ $labels.job }} has been down for more than 1 minute"
EOF

    # Alertmanager configuration
    cat > observability/alertmanager/alertmanager.yml << 'EOF'
global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@yourdomain.com'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://localhost:5001/'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'dev', 'instance']
EOF

    # OpenTelemetry Collector configuration
    cat > observability/otel-collector-config.yaml << 'EOF'
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:

exporters:
  prometheus:
    endpoint: "0.0.0.0:8888"
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
EOF

    log_success "Monitoring configurations created"
}

deploy_services() {
    log_info "Deploying production services..."
    
    # Stop any existing services
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans
    
    # Start all services
    $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    log_success "Services deployed successfully"
}

wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for database
    log_info "Waiting for PostgreSQL..."
    while ! $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" &>/dev/null; do
        sleep 2
    done
    log_success "PostgreSQL is ready"
    
    # Wait for Redis
    log_info "Waiting for Redis..."
    while ! $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis redis-cli --no-auth-warning -a "$REDIS_PASSWORD" ping &>/dev/null; do
        sleep 2
    done
    log_success "Redis is ready"
    
    # Wait for backend
    log_info "Waiting for backend API..."
    max_attempts=30
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost/api/health &>/dev/null; then
            break
        fi
        sleep 5
        ((attempt++))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        log_warning "Backend health check timeout, but continuing..."
    else
        log_success "Backend API is ready"
    fi
}

show_deployment_info() {
    log_success "🎉 PSScript has been deployed successfully!"
    echo
    log_info "Service URLs:"
    echo "  📱 Application:     http://localhost (Nginx proxy)"
    echo "  📊 Grafana:         http://localhost:3000"
    echo "  📈 Prometheus:      http://localhost:9090"
    echo "  🚨 Alertmanager:    http://localhost:9093"
    echo "  💾 PostgreSQL:      localhost:5432"
    echo "  🏃 Redis:           localhost:6379"
    echo
    log_info "Internal Service Ports:"
    echo "  Frontend:           3005 (behind Nginx)"
    echo "  Backend:            4000 (behind Nginx)"
    echo
    log_info "Default Credentials:"
    echo "  Grafana:  admin / $GRAFANA_ADMIN_PASSWORD"
    echo
    log_info "To view logs:"
    echo "  $COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE logs -f [service_name]"
    echo
    log_info "To stop services:"
    echo "  $COMPOSE_CMD -f $COMPOSE_FILE --env-file $ENV_FILE down"
    echo
    log_warning "Remember to:"
    echo "  1. Configure SSL certificates for production"
    echo "  2. Update DNS settings to point to this server"
    echo "  3. Configure backup procedures"
    echo "  4. Set up external monitoring/alerting"
}

# Main deployment flow
main() {
    log_info "Starting PSScript production deployment..."
    
    check_requirements
    check_env_file
    setup_directories
    create_monitoring_configs
    build_images
    deploy_services
    wait_for_services
    show_deployment_info
    
    log_success "Deployment completed successfully! 🚀"
}

# Handle script arguments
case "${1:-}" in
    "stop")
        log_info "Stopping PSScript services..."
        $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
        log_success "Services stopped"
        ;;
    "restart")
        log_info "Restarting PSScript services..."
        $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" restart
        log_success "Services restarted"
        ;;
    "logs")
        $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs -f "${2:-}"
        ;;
    "status")
        $COMPOSE_CMD -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
        ;;
    *)
        main
        ;;
esac