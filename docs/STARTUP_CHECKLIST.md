# PSScript Application Startup & Deployment Checklist

## Prerequisites

### System Requirements
- [ ] **Node.js**: Version 18.x or higher
- [ ] **Python**: Version 3.8+ with pip
- [ ] **Docker**: Version 20.0+ with Docker Compose
- [ ] **PostgreSQL**: Version 13+ (or Docker container)
- [ ] **Redis**: Version 6.0+ (or Docker container)
- [ ] **Operating System**: Windows 10/11, macOS 10.15+, or Linux (Ubuntu 20.04+)

### Development Tools
- [ ] **Git**: Latest version for version control
- [ ] **VS Code**: Recommended IDE with extensions:
  - TypeScript and JavaScript Language Features
  - Python Extension Pack
  - Docker Extension
  - ESLint
  - Prettier
- [ ] **PowerShell**: Version 7.0+ (for script testing)

### API Keys and External Services
- [ ] **OpenAI API Key**: Required for AI analysis features
- [ ] **Environment Variables**: Properly configured (see Environment Setup)

## Environment Setup

### 1. Clone and Initial Setup
```bash
# Clone the repository
git clone <repository-url> psscript
cd psscript

# Verify Node.js version
node --version  # Should be 18.x or higher

# Verify Python version
python --version  # Should be 3.8 or higher

# Verify Docker installation
docker --version
docker-compose --version
```

### 2. Environment Variables Configuration
- [ ] Copy `.env.example` to `.env` in project root
- [ ] Configure the following variables:

#### Database Configuration
```bash
# PostgreSQL Configuration
DB_HOST=localhost                    # Use 'postgres' for Docker
DB_PORT=5432
DB_NAME=psscript
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_SSL=false                        # Set to 'true' for production

# Connection Pool Settings
DB_POOL_MAX=20
DB_POOL_MIN=5
```

#### Cache Configuration
```bash
# Redis Configuration
REDIS_URL=redis://localhost:6379    # Use 'redis://redis:6379' for Docker
REDIS_HOST=localhost                # Use 'redis' for Docker
REDIS_PORT=6379
```

#### Application Configuration
```bash
# Node Environment
NODE_ENV=development                # Set to 'production' for deployment

# API Keys
OPENAI_API_KEY=your_openai_api_key  # Required for AI features
JWT_SECRET=your_jwt_secret_256_bit   # Generate secure random string

# Frontend Configuration
FRONTEND_URL=http://localhost:3002   # Update for production domain
API_BASE_URL=http://localhost:4000   # Update for production domain

# Feature Flags
ENABLE_FILE_UPLOAD=true
ENABLE_SCRIPT_ANALYSIS=true
ENABLE_KNOWLEDGE_SECTION=true
VECTOR_SEARCH_ENABLED=true
FILE_HASH_DEDUPLICATION=true
```

### 3. Docker Deployment Setup
- [ ] Ensure Docker and Docker Compose are running
- [ ] Configure docker-compose environment:

```bash
# Create Docker environment file
cp .env.docker.example .env

# Update Docker-specific variables
POSTGRES_HOST=postgres
REDIS_HOST=redis
```

## Development Environment Setup

### 1. Install Dependencies
```bash
# Install root dependencies
npm install

# Install frontend dependencies
cd src/frontend
npm install
cd ../..

# Install backend dependencies
cd src/backend
npm install
cd ../..

# Install Python dependencies for AI service
cd src/ai
pip install -r requirements.txt
cd ../..
```

### 2. Database Setup (Local Development)
```bash
# Start PostgreSQL (if not using Docker)
# Windows: Start PostgreSQL service
# macOS: brew services start postgresql
# Linux: sudo systemctl start postgresql

# Create database
createdb psscript

# Run database migrations
cd src/backend
npm run migrate
cd ../..
```

### 3. Start Development Services
```bash
# Terminal 1: Start frontend
cd src/frontend
npm run dev

# Terminal 2: Start backend
cd src/backend
npm run dev

# Terminal 3: Start AI service
cd src/ai
python -m uvicorn main:app --reload --port 8000

# Terminal 4: Start Redis (if not using Docker)
redis-server
```

## Docker Deployment

### 1. Development with Docker
```bash
# Start all services with Docker Compose
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f [service-name]

# Stop services
docker-compose down
```

### 2. Production Deployment
```bash
# Build production images
docker-compose -f docker-compose.yml up -d --build

# Verify deployment
docker-compose ps
docker-compose logs nginx
```

## 🔑 Default Login Credentials

### Development Mode Authentication
**⚠️ Current Setup: Authentication is bypassed in development mode**

The application currently runs in **development mode** with authentication disabled for easier testing. All routes are accessible without login required.

### For Production Deployment
When enabling authentication in production, use these default credentials:

```
Username: admin
Email: admin@example.com  
Password: admin123!
```

**🔒 SECURITY WARNING**: Change the default password immediately after first login in production!

### Authentication Status Check
```bash
# Check if authentication is enabled
curl http://localhost:4005/api/auth/status

# The response will show if auth is required
```

## Health Checks and Verification

### 1. Service Health Verification
- [ ] **Frontend**: Access http://localhost:3002
- [ ] **Backend API**: Access http://localhost:4005/api/health
- [ ] **AI Service**: Access http://localhost:8000
- [ ] **Database**: Run connection test
- [ ] **Redis**: Run connection test

### 2. Database Health Check
```bash
# Test PostgreSQL connection
cd src/backend
npm run test:db

# Test Redis connection
npm run test:redis

# Run comprehensive diagnostics
npm run diagnose:db
```

### 3. Application Feature Testing
- [ ] **Authentication**: Login/logout functionality
- [ ] **Script Upload**: Upload a PowerShell script
- [ ] **AI Analysis**: Verify script analysis works
- [ ] **Search**: Test script search functionality
- [ ] **User Management**: Create and manage users

## Security Checklist

### 1. Authentication & Authorization
- [ ] **JWT Secret**: Generate and secure 256-bit secret key
- [ ] **Password Requirements**: Minimum 8 characters enforced
- [ ] **User Roles**: Verify role-based access control
- [ ] **Session Management**: Proper token expiration

### 2. Network Security
- [ ] **CORS Configuration**: Properly configured origins
- [ ] **Rate Limiting**: Enabled for auth endpoints
- [ ] **Security Headers**: CSP, HSTS, X-Frame-Options configured
- [ ] **HTTPS**: Enabled for production deployment

### 3. Data Security
- [ ] **Database Encryption**: Enable SSL for database connections
- [ ] **Password Hashing**: bcrypt with proper salt rounds
- [ ] **Input Validation**: All API endpoints validate input
- [ ] **File Upload Security**: File type and size restrictions

## Performance Optimization

### 1. Database Performance
- [ ] **Connection Pooling**: Configured with appropriate pool size
- [ ] **Indexes**: Verify database indexes are created
- [ ] **Query Optimization**: Monitor slow queries
- [ ] **Vector Search**: pgvector extension enabled

### 2. Caching Strategy
- [ ] **Redis Configuration**: Properly configured for production
- [ ] **Cache TTL**: Appropriate time-to-live settings
- [ ] **Memory Cache Fallback**: Configured for Redis unavailability
- [ ] **Static Asset Caching**: Nginx caching configured

### 3. Application Performance
- [ ] **Code Splitting**: Frontend bundle optimization
- [ ] **Lazy Loading**: Components loaded on demand
- [ ] **API Response Time**: Monitor and optimize slow endpoints
- [ ] **Resource Monitoring**: CPU and memory usage tracking

## Monitoring and Logging

### 1. Application Logging
- [ ] **Log Levels**: Properly configured for environment
- [ ] **Error Tracking**: All errors logged with context
- [ ] **Performance Metrics**: Response times logged
- [ ] **Security Events**: Authentication failures logged

### 2. Infrastructure Monitoring
- [ ] **Health Endpoints**: All services expose health checks
- [ ] **Container Health**: Docker health checks configured
- [ ] **Database Monitoring**: Connection and query monitoring
- [ ] **Resource Usage**: Memory and CPU monitoring

## Backup and Recovery

### 1. Database Backup
- [ ] **Automated Backups**: Scheduled PostgreSQL backups
- [ ] **Backup Verification**: Test backup restoration
- [ ] **Retention Policy**: Define backup retention schedule
- [ ] **Off-site Storage**: Backup storage strategy

### 2. Application Data
- [ ] **User Data Backup**: User profiles and settings
- [ ] **Script Repository**: PowerShell scripts backup
- [ ] **Configuration Backup**: Environment and config files
- [ ] **Recovery Procedures**: Document recovery steps

## Deployment Validation

### 1. Pre-Deployment Checklist
- [ ] **Code Review**: All changes reviewed and approved
- [ ] **Testing**: Unit, integration, and e2e tests passing
- [ ] **Security Scan**: Vulnerability assessment completed
- [ ] **Performance Testing**: Load testing completed

### 2. Post-Deployment Verification
- [ ] **Smoke Tests**: Critical functionality verified
- [ ] **Performance Monitoring**: Response times within SLA
- [ ] **Error Monitoring**: No critical errors in logs
- [ ] **User Acceptance**: Stakeholder sign-off obtained

## Troubleshooting Common Issues

### 1. Database Connection Issues
```bash
# Check database connectivity
docker-compose logs postgres
npm run test:db

# Common fixes:
- Verify environment variables
- Check network connectivity
- Validate credentials
- Ensure database is running
```

### 2. Authentication Problems
```bash
# Check JWT configuration
- Verify JWT_SECRET is set
- Check token expiration settings
- Validate CORS configuration
- Test with fresh token
```

### 3. Performance Issues
```bash
# Monitor resource usage
docker stats
npm run diagnose:db

# Common optimizations:
- Increase database pool size
- Enable Redis caching
- Optimize database queries
- Scale container resources
```

## Production Deployment

### 1. Production Environment Variables
```bash
NODE_ENV=production
DB_SSL=true
FRONTEND_URL=https://your-domain.com
API_BASE_URL=https://api.your-domain.com
```

### 2. SSL/TLS Configuration
- [ ] **SSL Certificates**: Valid certificates installed
- [ ] **HTTPS Redirect**: HTTP to HTTPS redirection configured
- [ ] **HSTS Headers**: HTTP Strict Transport Security enabled
- [ ] **Certificate Renewal**: Automated renewal configured

### 3. Scaling Considerations
- [ ] **Load Balancing**: Multiple backend instances if needed
- [ ] **Database Scaling**: Read replicas for high traffic
- [ ] **CDN Configuration**: Static asset delivery optimization
- [ ] **Auto-scaling**: Container orchestration configured

## Maintenance Schedule

### Daily Tasks
- [ ] **Log Review**: Check error logs and performance metrics
- [ ] **Health Checks**: Verify all services are running
- [ ] **Backup Verification**: Confirm automated backups completed

### Weekly Tasks
- [ ] **Security Updates**: Apply critical security patches
- [ ] **Performance Review**: Analyze response times and resource usage
- [ ] **User Feedback**: Review and address user issues

### Monthly Tasks
- [ ] **Dependency Updates**: Update npm and pip packages
- [ ] **Security Audit**: Run comprehensive security scans
- [ ] **Backup Testing**: Test backup restoration procedures
- [ ] **Performance Optimization**: Review and optimize slow queries

---

## Support and Documentation

- **Technical Documentation**: `/docs/TECHNICAL_DOCUMENTATION.md`
- **User Training**: `/docs/training/`
- **API Documentation**: `http://localhost:4000/api-docs`
- **Management Presentation**: `/docs/presentation/PSSCRIPT_OVERVIEW.md`

For additional support, refer to the comprehensive technical documentation or contact the development team.