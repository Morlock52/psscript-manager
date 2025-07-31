#!/bin/bash

# PSScript Auto-Update Deployment System
# Version: 1.0.0
# Date: July 31, 2025

set -euo pipefail

# Configuration
SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"
DEPLOYMENT_DIR="/opt/psscript"
LOG_DIR="/var/log/psscript"
BACKUP_DIR="/opt/psscript-backups"
HEALTH_CHECK_URL="http://localhost/api/health"
WEBHOOK_URL="${WEBHOOK_URL:-}" # Optional webhook for notifications

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a deploy.log
}

error() {
    echo -e "${RED}[ERROR $(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a deploy.log
    send_notification "Deployment Error" "$1" "error"
    exit 1
}

warn() {
    echo -e "${YELLOW}[WARN $(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a deploy.log
}

# Send notifications (webhook, email, etc.)
send_notification() {
    local title=$1
    local message=$2
    local level=${3:-info}
    
    if [ -n "$WEBHOOK_URL" ]; then
        curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"title\":\"$title\",\"message\":\"$message\",\"level\":\"$level\"}" || true
    fi
}

# Create deployment package
create_deployment_package() {
    log "Creating deployment package..."
    
    # Build frontend
    cd src/frontend
    npm run build || error "Frontend build failed"
    cd ../..
    
    # Create package directory
    rm -rf deploy-package
    mkdir -p deploy-package/{frontend,backend,ai,db,scripts,configs}
    
    # Copy application files
    cp -r src/frontend/dist/* deploy-package/frontend/
    cp -r src/backend/* deploy-package/backend/
    cp -r src/ai/* deploy-package/ai/
    cp -r src/db/* deploy-package/db/
    
    # Create docker-compose with health checks and logging
    cat > deploy-package/docker-compose.yml << 'EOF'
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    container_name: psscript-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./frontend:/usr/share/nginx/html:ro
      - ./configs/nginx.conf:/etc/nginx/nginx.conf:ro
      - nginx-logs:/var/log/nginx
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        labels: "service=nginx"

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    container_name: psscript-backend
    environment:
      - NODE_ENV=production
      - PORT=4000
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=psscript
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD:-secure_password}
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET:-secure_jwt_secret}
      - AI_SERVICE_URL=http://ai-service:8000
      - LOG_LEVEL=${LOG_LEVEL:-info}
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:4000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    volumes:
      - backend-logs:/app/logs
      - ./backend/uploads:/app/uploads
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        labels: "service=backend"

  ai-service:
    build:
      context: ./ai
      dockerfile: Dockerfile.prod
    container_name: psscript-ai
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - MOCK_MODE=${MOCK_MODE:-false}
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=psscript
      - DB_USER=postgres
      - DB_PASSWORD=${DB_PASSWORD:-secure_password}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    volumes:
      - ai-logs:/app/logs
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        labels: "service=ai"

  postgres:
    image: pgvector/pgvector:pg15
    container_name: psscript-postgres
    environment:
      - POSTGRES_DB=psscript
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${DB_PASSWORD:-secure_password}
      - POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql:ro
      - ./db/seeds/01-initial-data.sql:/docker-entrypoint-initdb.d/02-seed.sql:ro
      - postgres-logs:/var/log/postgresql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        labels: "service=postgres"

  redis:
    image: redis:7-alpine
    container_name: psscript-redis
    command: redis-server --appendonly yes --appendfsync everysec
    volumes:
      - redis_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "5"
        labels: "service=redis"

  # Log collector service
  promtail:
    image: grafana/promtail:latest
    container_name: psscript-promtail
    volumes:
      - ./configs/promtail-config.yml:/etc/promtail/config.yml:ro
      - /var/log:/var/log:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - nginx-logs:/var/log/nginx:ro
      - backend-logs:/var/log/backend:ro
      - ai-logs:/var/log/ai:ro
      - postgres-logs:/var/log/postgres:ro
    command: -config.file=/etc/promtail/config.yml
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres_data:
  redis_data:
  nginx-logs:
  backend-logs:
  ai-logs:
  postgres-logs:

networks:
  default:
    name: psscript-network
EOF

    # Create nginx config
    cat > deploy-package/configs/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Logging
    log_format json_combined escape=json
    '{'
        '"time_local":"$time_local",'
        '"remote_addr":"$remote_addr",'
        '"remote_user":"$remote_user",'
        '"request":"$request",'
        '"status": "$status",'
        '"body_bytes_sent":"$body_bytes_sent",'
        '"request_time":"$request_time",'
        '"http_referrer":"$http_referer",'
        '"http_user_agent":"$http_user_agent"'
    '}';
    
    access_log /var/log/nginx/access.log json_combined;
    error_log /var/log/nginx/error.log warn;
    
    # Performance
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    server {
        listen 80;
        server_name _;
        
        # Frontend
        location / {
            root /usr/share/nginx/html;
            try_files $uri $uri/ /index.html;
            expires 1h;
            add_header Cache-Control "public, immutable";
        }
        
        # API proxy
        location /api {
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            # Timeouts
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
        
        # Metrics endpoint (internal only)
        location /metrics {
            allow 127.0.0.1;
            deny all;
            proxy_pass http://backend:4000/metrics;
        }
    }
}
EOF

    # Create Promtail config for log shipping
    cat > deploy-package/configs/promtail-config.yml << 'EOF'
server:
  http_listen_port: 9080
  grpc_listen_port: 0

positions:
  filename: /tmp/positions.yaml

clients:
  - url: ${LOKI_URL:-http://localhost:3100/loki/api/v1/push}

scrape_configs:
  - job_name: containers
    static_configs:
      - targets:
          - localhost
        labels:
          job: psscript
          __path__: /var/lib/docker/containers/*/*log
    
    pipeline_stages:
      - json:
          expressions:
            output: log
            stream: stream
            attrs:
      - json:
          expressions:
            tag:
          source: attrs
      - regex:
          expression: (?P<container_name>(?:[^|]*))\|(?P<image_name>(?:[^|]*))
          source: tag
      - timestamp:
          format: RFC3339Nano
          source: time
      - labels:
          stream:
          container_name:
          image_name:
      - output:
          source: output

  - job_name: nginx
    static_configs:
      - targets:
          - localhost
        labels:
          job: nginx
          __path__: /var/log/nginx/*.log

  - job_name: application
    static_configs:
      - targets:
          - localhost
        labels:
          job: application
          __path__: /var/log/{backend,ai}/*.log
EOF

    # Create health check script
    cat > deploy-package/scripts/health-check.sh << 'EOF'
#!/bin/bash
set -euo pipefail

# Health check endpoints
ENDPOINTS=(
    "http://localhost/health"
    "http://localhost/api/health"
    "http://localhost:4000/api/health"
    "http://localhost:8000/health"
)

# Check each endpoint
failed=0
for endpoint in "${ENDPOINTS[@]}"; do
    if curl -sf "$endpoint" > /dev/null 2>&1; then
        echo "✓ $endpoint is healthy"
    else
        echo "✗ $endpoint is unhealthy"
        ((failed++))
    fi
done

# Check container health
unhealthy_containers=$(docker ps --filter health=unhealthy --format "{{.Names}}" | wc -l)
if [ "$unhealthy_containers" -gt 0 ]; then
    echo "✗ Found $unhealthy_containers unhealthy containers"
    docker ps --filter health=unhealthy
    ((failed++))
fi

if [ $failed -eq 0 ]; then
    echo "✓ All health checks passed"
    exit 0
else
    echo "✗ $failed health checks failed"
    exit 1
fi
EOF

    # Create update script
    cat > deploy-package/scripts/update.sh << 'EOF'
#!/bin/bash
set -euo pipefail

DEPLOYMENT_DIR="/opt/psscript"
BACKUP_DIR="/opt/psscript-backups"
LOG_FILE="/var/log/psscript/update.log"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create backup
create_backup() {
    log "Creating backup..."
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    docker exec psscript-postgres pg_dump -U postgres psscript > "$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).sql"
    
    # Backup volumes
    docker run --rm -v psscript_postgres_data:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/postgres-data-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
    
    # Backup current deployment
    tar czf "$BACKUP_DIR/deployment-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$DEPLOYMENT_DIR" .
    
    # Keep only last 5 backups
    ls -t "$BACKUP_DIR"/*.tar.gz | tail -n +6 | xargs -r rm
    ls -t "$BACKUP_DIR"/*.sql | tail -n +6 | xargs -r rm
    
    log "Backup completed"
}

# Perform health check
health_check() {
    bash "$DEPLOYMENT_DIR/scripts/health-check.sh"
}

# Update application
update_application() {
    log "Starting application update..."
    
    # Extract new version
    tar xzf /tmp/psscript-update.tar.gz -C "$DEPLOYMENT_DIR"
    
    # Pull new images
    docker-compose pull
    
    # Perform rolling update
    docker-compose up -d --no-deps --build backend
    sleep 30
    
    if health_check; then
        docker-compose up -d --no-deps --build ai-service
        sleep 20
        
        if health_check; then
            docker-compose up -d --no-deps --build nginx
            sleep 10
            
            if health_check; then
                log "Update completed successfully"
                return 0
            fi
        fi
    fi
    
    log "Update failed, initiating rollback..."
    return 1
}

# Rollback function
rollback() {
    log "Starting rollback..."
    
    # Find latest backup
    latest_backup=$(ls -t "$BACKUP_DIR"/deployment-*.tar.gz | head -1)
    
    if [ -n "$latest_backup" ]; then
        # Stop services
        docker-compose down
        
        # Restore deployment
        rm -rf "$DEPLOYMENT_DIR"/*
        tar xzf "$latest_backup" -C "$DEPLOYMENT_DIR"
        
        # Start services
        docker-compose up -d
        
        sleep 30
        
        if health_check; then
            log "Rollback completed successfully"
        else
            log "Rollback failed - manual intervention required"
            exit 1
        fi
    else
        log "No backup found for rollback"
        exit 1
    fi
}

# Main update process
main() {
    cd "$DEPLOYMENT_DIR"
    
    # Pre-update health check
    if ! health_check; then
        log "Pre-update health check failed"
        exit 1
    fi
    
    # Create backup
    create_backup
    
    # Attempt update
    if update_application; then
        log "Update successful"
        
        # Cleanup old images
        docker image prune -f
    else
        rollback
    fi
    
    # Send logs to remote server
    if [ -n "${LOG_SHIP_URL:-}" ]; then
        curl -X POST "$LOG_SHIP_URL" \
            -H "Content-Type: text/plain" \
            --data-binary "@$LOG_FILE" || true
    fi
}

# Run main function
main "$@"
EOF

    # Create monitoring script
    cat > deploy-package/scripts/monitor.sh << 'EOF'
#!/bin/bash
set -euo pipefail

# Continuous monitoring script
while true; do
    # Collect metrics
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Docker stats
    DOCKER_STATS=$(docker stats --no-stream --format "json" 2>/dev/null || echo '{}')
    
    # Disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    # Memory usage
    MEMORY_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
    
    # Create metrics JSON
    cat > /tmp/metrics.json << JSON
{
    "timestamp": "$TIMESTAMP",
    "disk_usage_percent": $DISK_USAGE,
    "memory_usage_percent": $MEMORY_USAGE,
    "docker_stats": $DOCKER_STATS,
    "health_check": $(bash /opt/psscript/scripts/health-check.sh > /dev/null 2>&1 && echo "true" || echo "false")
}
JSON
    
    # Ship metrics if URL provided
    if [ -n "${METRICS_URL:-}" ]; then
        curl -s -X POST "$METRICS_URL" \
            -H "Content-Type: application/json" \
            -d @/tmp/metrics.json || true
    fi
    
    # Auto-recovery
    if ! bash /opt/psscript/scripts/health-check.sh > /dev/null 2>&1; then
        echo "Health check failed, attempting recovery..."
        
        # Restart unhealthy containers
        docker ps --filter health=unhealthy --format "{{.Names}}" | xargs -r docker restart
        
        # Wait and recheck
        sleep 30
        
        if ! bash /opt/psscript/scripts/health-check.sh > /dev/null 2>&1; then
            # Send alert
            if [ -n "${ALERT_URL:-}" ]; then
                curl -s -X POST "$ALERT_URL" \
                    -H "Content-Type: application/json" \
                    -d '{"alert": "PSScript health check failed after auto-recovery attempt"}' || true
            fi
        fi
    fi
    
    # Sleep for 5 minutes
    sleep 300
done
EOF

    # Make scripts executable
    chmod +x deploy-package/scripts/*.sh
    
    # Create .env template
    cat > deploy-package/.env << 'EOF'
# Database
DB_PASSWORD=secure_password_here

# Authentication
JWT_SECRET=your_jwt_secret_here

# External Services
OPENAI_API_KEY=your_openai_key_here

# Monitoring
LOKI_URL=http://your-loki-server:3100/loki/api/v1/push
LOG_SHIP_URL=https://your-log-collector/logs
METRICS_URL=https://your-metrics-collector/metrics
ALERT_URL=https://your-alerting-webhook/alert
WEBHOOK_URL=https://your-notification-webhook

# Feature Flags
MOCK_MODE=false
LOG_LEVEL=info
EOF

    # Create deployment archive
    tar czf psscript-deployment.tar.gz -C deploy-package .
    
    log "Deployment package created successfully"
}

# Deploy to server
deploy_to_server() {
    log "Deploying to server $SERVER_IP..."
    
    # Check sshpass availability
    if ! command -v sshpass &> /dev/null; then
        error "sshpass is required. Install with: brew install hudochenkov/sshpass/sshpass"
    fi
    
    # Upload deployment package
    log "Uploading deployment package..."
    sshpass -p "$SERVER_PASS" scp psscript-deployment.tar.gz $SERVER_USER@$SERVER_IP:/tmp/
    
    # Execute deployment on server
    log "Executing deployment on server..."
    sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
set -euo pipefail

# Create directories
mkdir -p /opt/psscript /var/log/psscript /opt/psscript-backups

# Stop existing services
cd /opt/psscript
docker-compose down 2>/dev/null || true

# Extract new deployment
tar xzf /tmp/psscript-deployment.tar.gz -C /opt/psscript

# Start services
cd /opt/psscript
docker-compose up -d

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 60

# Run health check
if bash scripts/health-check.sh; then
    echo "Deployment successful!"
    
    # Start monitoring in background
    nohup bash scripts/monitor.sh > /var/log/psscript/monitor.log 2>&1 &
    echo $! > /var/run/psscript-monitor.pid
    
    # Setup auto-update cron job
    (crontab -l 2>/dev/null; echo "0 2 * * * /opt/psscript/scripts/update.sh >> /var/log/psscript/auto-update.log 2>&1") | crontab -
    
    echo "Monitoring and auto-update configured"
else
    echo "Deployment failed - health checks not passing"
    docker-compose logs
    exit 1
fi
ENDSSH
    
    # Cleanup
    rm -f psscript-deployment.tar.gz
    rm -rf deploy-package
    
    log "Deployment completed successfully!"
    log "Access your application at: http://$SERVER_IP"
    log "Default login: admin@example.com / admin123!"
    
    send_notification "Deployment Success" "PSScript deployed successfully to $SERVER_IP" "success"
}

# Main execution
main() {
    log "Starting PSScript deployment process..."
    
    # Check prerequisites
    command -v npm &> /dev/null || error "npm is required"
    command -v docker &> /dev/null || error "docker is required"
    
    # Create deployment package
    create_deployment_package
    
    # Deploy to server
    deploy_to_server
    
    log "All tasks completed successfully!"
}

# Run main function
main "$@"