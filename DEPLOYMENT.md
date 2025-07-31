# PSScript Deployment Guide

This document provides comprehensive instructions for deploying the PSScript application on different servers.

## Deployment Packages

Two deployment packages have been created:

1. `psscript-deploy-20250322.tar.gz` - Contains deployment scripts and configuration files
2. `psscript-docker-images-20250322.tar.gz` - Contains pre-built Docker images

## Deployment Options

### Option 1: Deploy with Pre-built Images (Recommended)

This is the simplest option and doesn't require access to the source code or building from scratch.

1. Copy both packages to your server:
   ```bash
   scp psscript-deploy-20250322.tar.gz user@your-server:/path/to/destination/
   scp psscript-docker-images-20250322.tar.gz user@your-server:/path/to/destination/
   ```

2. SSH into your server:
   ```bash
   ssh user@your-server
   ```

3. Extract the deployment package:
   ```bash
   cd /path/to/destination
   tar -xzf psscript-deploy-20250322.tar.gz
   ```

4. Extract the Docker images:
   ```bash
   tar -xzf psscript-docker-images-20250322.tar.gz
   ```

5. Run the deployment script:
   ```bash
   cd deploy
   chmod +x deploy.sh
   ./deploy.sh
   ```

6. The script will:
   - Create a `.env` file from `.env.example` if it doesn't exist
   - Prompt you to edit it with your configuration
   - Load the Docker images
   - Start all services using Docker Compose

### Option 2: Build Images on the Server

If you need to customize the images or have the complete source code:

1. Copy the entire repository to your server
2. Copy the deployment package to your server
3. Extract the deployment package:
   ```bash
   tar -xzf psscript-deploy-20250322.tar.gz
   ```
4. Build the Docker images:
   ```bash
   cd deploy
   chmod +x build-images.sh
   ./build-images.sh
   ```
5. Deploy the application:
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

## Configuration

The application is configured through environment variables defined in the `.env` file. Important settings include:

- `DB_PASSWORD`: Password for the PostgreSQL database
- `JWT_SECRET`: Secret for JWT token generation (used for authentication)
- `OPENAI_API_KEY`: API key for OpenAI services (required for AI features)
- `MOCK_MODE`: Set to 'true' to use mock AI responses, or 'false' to use the real OpenAI API

## Accessing the Application

After deployment, the services will be available at:

- Frontend: http://your-server:3002
- Backend API: http://your-server:4000
- AI Service: http://your-server:8000

## Managing the Deployment

### View Container Status
```bash
cd deploy
docker-compose -f docker-compose.prod.yml ps
```

### View Logs
```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs -f

# View logs for a specific service
docker-compose -f docker-compose.prod.yml logs -f frontend
```

### Restart a Service
```bash
docker-compose -f docker-compose.prod.yml restart frontend
```

### Stop All Services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Update the Application
To update to a new version:

1. Stop the current deployment:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```
2. Follow the deployment instructions again with new packages

## Production Considerations

For a production deployment, consider the following:

1. **SSL/TLS**: Set up a reverse proxy like Nginx for SSL termination
   
2. **Backups**: Set up regular backups of the PostgreSQL volume
   ```bash
   # Example backup script for the database
   docker-compose -f docker-compose.prod.yml exec postgres pg_dump -U postgres psscript > backup.sql
   ```

3. **Monitoring**: Set up monitoring for the services using tools like Prometheus and Grafana

4. **Firewall**: Configure a firewall to restrict access to only necessary ports
   ```bash
   # Example: Allow only specific ports
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw allow 22/tcp
   ```

5. **Resource Limits**: Set resource limits for containers in docker-compose.prod.yml
   ```yaml
   services:
     frontend:
       deploy:
         resources:
           limits:
             cpus: '0.5'
             memory: 512M
   ```

## Troubleshooting

1. **Database Connection Issues**:
   - Check if PostgreSQL container is running: `docker-compose -f docker-compose.prod.yml ps postgres`
   - Verify database credentials in `.env` file
   - Check logs: `docker-compose -f docker-compose.prod.yml logs postgres`

2. **Application Not Starting**:
   - Check individual container logs for errors
   - Ensure all required environment variables are set
   - Verify Docker images were loaded correctly

3. **Performance Issues**:
   - Check resource usage: `docker stats`
   - Consider increasing resources for containers
   - Look for memory leaks in logs

For further assistance, consult the internal documentation or the project's GitHub repository.