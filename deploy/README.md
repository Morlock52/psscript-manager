# PSScript Deployment Package

This package contains everything needed to deploy the PSScript application on a new server.

## Contents

- `docker-compose.prod.yml`: Production Docker Compose configuration
- `.env.example`: Example environment variables file (copy to .env and customize)
- `build-images.sh`: Script to build Docker images from source code
- `save-images.sh`: Script to save Docker images as tar files for offline deployment
- `deploy.sh`: Script to deploy the application

## Deployment Instructions

### Option 1: Deploy with pre-built images

If you have the Docker images saved in the `images` directory:

1. Copy the entire `deploy` directory to your server
2. Run the deployment script:

```bash
cd deploy
chmod +x deploy.sh
./deploy.sh
```

The script will:
- Create a `.env` file from `.env.example` if it doesn't exist
- Load Docker images from tar files if they exist in the `images` directory
- Start all services using Docker Compose

### Option 2: Build images on the server

If you have the source code on your server:

1. Copy the entire repository to your server
2. Build the Docker images:

```bash
cd deploy
chmod +x build-images.sh
./build-images.sh
```

3. Deploy the application:

```bash
chmod +x deploy.sh
./deploy.sh
```

## Configuration

Edit the `.env` file to customize your deployment. Important settings include:

- `DB_PASSWORD`: Password for the PostgreSQL database
- `JWT_SECRET`: Secret for JWT token generation
- `OPENAI_API_KEY`: API key for OpenAI services

## Accessing the Application

After deployment, the services will be available at:

- Frontend: http://localhost:3002
- Backend API: http://localhost:4000
- AI Service: http://localhost:8000

## Managing the Deployment

```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Stop all services
docker-compose -f docker-compose.prod.yml down
```

## Production Considerations

- Use a reverse proxy like Nginx for SSL termination
- Set up proper backup and monitoring
- Use strong passwords and secure your environment variables
- Consider configuring a firewall to restrict access to services
