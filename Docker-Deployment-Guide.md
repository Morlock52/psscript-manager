# PSScript Docker Deployment Guide

This guide provides instructions for deploying the PSScript Manager application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system
- Git repository cloned to your local system

## Quick Start

To deploy all services with a single command:

```bash
docker-compose up -d
```

This will start the following services:
- Frontend (React) on port 3002
- Backend (Node.js/Express) on port 4000
- AI Service (Python/FastAPI) on port 8000
- PostgreSQL database on port 5432
- Redis cache on port 6379
- PGAdmin interface on port 5050
- Redis Commander interface on port 8082

## Deployment Options

### Development Mode

For development with live reloading:

```bash
# Use the default configuration with development settings
docker-compose up -d
```

### Production Mode

For production deployments:

```bash
# Use production configuration
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Service Access

- Frontend UI: http://localhost:3002
- Backend API: http://localhost:4000/api
- AI Service API: http://localhost:8000
- PostgreSQL Database: localhost:5432
- Redis Cache: localhost:6379
- PGAdmin Interface: http://localhost:5050
  - Username: admin@example.com
  - Password: admin
- Redis Commander: http://localhost:8082

## Container Management

### View Running Containers

```bash
docker-compose ps
```

### Check Container Logs

```bash
# View logs for a specific service
docker-compose logs [service-name]

# Follow logs in real-time
docker-compose logs -f [service-name]

# Available service names:
# - frontend
# - backend
# - ai-service
# - postgres
# - redis
# - pgadmin
# - redis-commander
```

### Stop All Services

```bash
docker-compose down
```

### Rebuild Containers

```bash
# Rebuild specific service
docker-compose build [service-name]

# Rebuild all services
docker-compose build

# Rebuild and start
docker-compose up -d --build
```

## Data Persistence

The application uses Docker volumes for data persistence:

- `postgres_data`: Stores PostgreSQL database files
- `redis_data`: Stores Redis cache data

## Customization

### Environment Variables

Create a `.env` file in the project root to customize deployment:

```
# Database configuration
DB_NAME=psscript
DB_USER=postgres
DB_PASSWORD=secure_password

# API keys
OPENAI_API_KEY=your_openai_api_key

# Environment setting
NODE_ENV=production
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**
   
   If you have services already running on the required ports, change them in the docker-compose.yml file.

2. **Database Connection Issues**
   
   Ensure PostgreSQL is running and properly initialized:
   ```bash
   docker-compose logs postgres
   ```

3. **AI Service Errors**
   
   Check for missing environment variables or API keys:
   ```bash
   docker-compose logs ai-service
   ```

4. **Platform Compatibility Warnings**
   
   Some images may show platform compatibility warnings, but they typically still work correctly.

### Resetting the Environment

To completely reset the environment, including all data:

```bash
# Stop all containers and remove volumes
docker-compose down -v

# Remove all built images for this project
docker-compose down --rmi local

# Start fresh
docker-compose up -d
```

## Integration Testing

Once the system is running, you can test integration between services:

```bash
# Test database connectivity
cd src/backend
node test-db.js

# Test Redis connectivity
cd src/backend
node test-redis.js
```