# PSScript IONOS Manual Deployment Guide

## Server Details
- **Host**: 74.208.184.195
- **User**: root
- **Password**: Morlock52b
- **Target Directory**: /opt/psscript

## Step 1: Connect to the Server

```bash
ssh root@74.208.184.195
# Enter password: Morlock52b
```

## Step 2: Check and Free Port 80

Once connected, run these commands:

```bash
# Check what's using port 80
lsof -Pi :80 -sTCP:LISTEN
netstat -tuln | grep :80

# Stop any web services
systemctl stop apache2 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true
systemctl stop httpd 2>/dev/null || true

# Disable them permanently
systemctl disable apache2 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true
systemctl disable httpd 2>/dev/null || true

# Force kill anything on port 80
fuser -k 80/tcp 2>/dev/null || true
```

## Step 3: Install Docker and Docker Compose

```bash
# Install Docker
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

# Verify installations
docker --version
docker-compose --version
```

## Step 4: Create PSScript Directory

```bash
mkdir -p /opt/psscript
cd /opt/psscript
```

## Step 5: Create Minimal Docker Configuration

Create a `docker-compose.yml` file:

```bash
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./html:/usr/share/nginx/html:ro
    restart: unless-stopped
EOF
```

Create `nginx.conf`:

```bash
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name _;
        
        location / {
            root /usr/share/nginx/html;
            index index.html;
        }
        
        location /health {
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF
```

Create a test HTML page:

```bash
mkdir -p html
cat > html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>PSScript - IONOS Deployment</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px;
            background: #f0f0f0;
        }
        .container {
            background: white;
            max-width: 600px;
            margin: 0 auto;
            padding: 40px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { color: #0078d4; }
        .success { color: #4caf50; font-size: 48px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="success">✅</div>
        <h1>PSScript on IONOS</h1>
        <p>Web server is running successfully on port 80!</p>
        <p>Server IP: 74.208.184.195</p>
        <hr>
        <p>Next step: Deploy the full PSScript application</p>
    </div>
</body>
</html>
EOF
```

## Step 6: Start the Services

```bash
# Stop any existing containers
docker-compose down 2>/dev/null || true

# Start the web server
docker-compose up -d

# Check if it's running
docker-compose ps

# Test locally
curl http://localhost
```

## Step 7: Verify Deployment

From your local machine, open a web browser and go to:
- http://74.208.184.195

You should see the PSScript deployment success page.

## Step 8: Deploy Full Application (Optional)

Once the basic setup is confirmed working, you can deploy the full PSScript application by:

1. Stopping the test container: `docker-compose down`
2. Copying the full application files to the server
3. Using the production docker-compose configuration

## Troubleshooting

If port 80 is still blocked:

```bash
# Check IONOS firewall rules
iptables -L -n | grep 80

# Check if SELinux is blocking
getenforce
# If enforcing, temporarily disable:
setenforce 0

# Check system logs
journalctl -xe | grep -i denied
```

If Docker won't start:

```bash
# Check Docker service
systemctl status docker
systemctl start docker
systemctl enable docker

# Check Docker logs
journalctl -u docker.service
```

## Alternative Ports

If port 80 is absolutely blocked by IONOS, try these alternatives:

- **Port 8080**: Common alternative HTTP port
- **Port 3000**: Common Node.js port
- **Port 8888**: Another alternative

Change the port in docker-compose.yml:
```yaml
ports:
  - "8080:80"  # Map port 8080 to container's port 80
```

## Quick Test Commands

```bash
# Test if port 80 is accessible
curl -I http://localhost

# Check Docker logs
docker-compose logs

# Restart services
docker-compose restart

# View running containers
docker ps

# Check port listeners
netstat -tuln | grep LISTEN
```

## Success Indicators

You know the deployment is successful when:
1. `docker-compose ps` shows the container as "Up"
2. `curl http://localhost` returns HTML content
3. Browser shows the success page at http://74.208.184.195
4. No errors in `docker-compose logs`

## Next Steps

After confirming the basic deployment works:
1. Create a full deployment script
2. Transfer the PSScript application files
3. Set up the database (PostgreSQL with pgvector)
4. Configure environment variables
5. Set up SSL/TLS if needed
6. Configure backups and monitoring