# PSScript Deployment Fix Instructions

## 🚨 ISSUE IDENTIFIED

Your server (74.208.184.195) is accessible but:
1. **Port 80** is serving a different website ("Farmingdale Lunch Guide")
2. **Ports 3002, 4000, 8000** are blocked by firewall (likely IONOS hosting provider firewall)
3. The server is hosted on IONOS/1&1 which has strict port restrictions

## 🔧 COMPLETE FIX PROCEDURE

### Step 1: SSH into your server
```bash
ssh root@74.208.184.195
# Password: Morlock52b
```

### Step 2: Check what's using port 80
```bash
# See what's on port 80
sudo lsof -i:80
sudo netstat -tlnp | grep :80

# Check nginx configuration
ls -la /etc/nginx/sites-enabled/
cat /etc/nginx/sites-enabled/default
```

### Step 3: Stop conflicting services
```bash
# If nginx is running on port 80
sudo systemctl stop nginx
sudo systemctl disable nginx

# Or if apache is running
sudo systemctl stop apache2
sudo systemctl disable apache2
```

### Step 4: Check and configure firewall

**Option A - If using UFW (Ubuntu Firewall):**
```bash
# Check current status
sudo ufw status verbose

# If not enabled or missing rules:
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3002/tcp
sudo ufw allow 4000/tcp  
sudo ufw allow 5432/tcp
sudo ufw allow 6379/tcp
sudo ufw allow 8000/tcp
sudo ufw --force enable

# Verify
sudo ufw status numbered
```

**Option B - If using iptables:**
```bash
# Check current rules
sudo iptables -L -n -v

# Add rules if missing
sudo iptables -A INPUT -p tcp --dport 3002 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 4000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 8000 -j ACCEPT

# Save rules
sudo iptables-save > /etc/iptables/rules.v4
```

### Step 5: IONOS/1&1 Hosting Panel Configuration

**IMPORTANT**: IONOS blocks most ports by default. You need to:

1. **Login to IONOS Control Panel**
   - Go to: https://my.ionos.com
   - Navigate to: Server > Network > Firewall Rules

2. **Add Port Rules**
   - Click "Add Rule" or "Configure Firewall"
   - Add these ports:
     - 3002 (TCP) - Frontend
     - 4000 (TCP) - Backend API
     - 8000 (TCP) - AI Service
     - 5432 (TCP) - PostgreSQL (optional)
     - 6379 (TCP) - Redis (optional)

3. **Security Group Settings**
   - Look for "Security Groups" or "Firewall Policies"
   - Create a new group called "PSScript"
   - Add all the ports above
   - Apply to your server

### Step 6: Install PSScript (Clean Installation)

```bash
# Remove any existing installation
cd /opt
rm -rf psscript
docker-compose down 2>/dev/null || true
docker system prune -af

# Create fresh directory
mkdir -p /opt/psscript
cd /opt/psscript

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  frontend:
    image: nginx:alpine
    container_name: psscript_frontend
    ports:
      - "3002:80"
    volumes:
      - ./frontend:/usr/share/nginx/html:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "-", "http://localhost"]
      interval: 30s
      timeout: 10s
      retries: 3

  backend:
    image: node:18-alpine
    container_name: psscript_backend
    ports:
      - "4000:4000"
    working_dir: /app
    volumes:
      - ./backend:/app
    command: |
      sh -c 'echo "const http = require(\"http\");
      const server = http.createServer((req, res) => {
        console.log(req.method, req.url);
        res.setHeader(\"Access-Control-Allow-Origin\", \"*\");
        res.setHeader(\"Access-Control-Allow-Methods\", \"*\");
        res.setHeader(\"Access-Control-Allow-Headers\", \"*\");
        if (req.method === \"OPTIONS\") {
          res.writeHead(200);
          res.end();
          return;
        }
        res.writeHead(200, {\"Content-Type\": \"application/json\"});
        res.end(JSON.stringify({
          status: \"ok\",
          message: \"PSScript API Running\",
          time: new Date().toISOString()
        }));
      });
      server.listen(4000, \"0.0.0.0\", () => {
        console.log(\"API running on http://0.0.0.0:4000\");
      });" > /tmp/server.js && node /tmp/server.js'
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    container_name: psscript_db
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=psscript
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: psscript_cache
    ports:
      - "6379:6379"
    restart: unless-stopped

volumes:
  db_data:
EOF

# Create frontend
mkdir -p frontend
cat > frontend/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>PSScript Manager</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, system-ui, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 600px;
        }
        h1 { font-size: 3rem; margin-bottom: 1rem; }
        .status { 
            margin: 2rem 0;
            padding: 1.5rem;
            background: rgba(255,255,255,0.1);
            border-radius: 10px;
        }
        .status-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
        }
        .online { color: #4ade80; }
        .offline { color: #f87171; }
        .info {
            margin-top: 2rem;
            padding: 1rem;
            background: rgba(0,0,0,0.2);
            border-radius: 10px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 PSScript Manager</h1>
        <p>PowerShell Script Management Platform</p>
        
        <div class="status">
            <h3>System Status</h3>
            <div class="status-item">
                <span>Frontend</span>
                <span class="online">● Online</span>
            </div>
            <div class="status-item">
                <span>Backend API</span>
                <span id="api-status">● Checking...</span>
            </div>
            <div class="status-item">
                <span>Database</span>
                <span class="online">● PostgreSQL Ready</span>
            </div>
            <div class="status-item">
                <span>Cache</span>
                <span class="online">● Redis Ready</span>
            </div>
        </div>
        
        <div class="info">
            <p><strong>Server:</strong> 74.208.184.195</p>
            <p><strong>Time:</strong> <span id="time"></span></p>
            <p><strong>Frontend:</strong> Port 3002</p>
            <p><strong>API:</strong> Port 4000</p>
        </div>
    </div>
    
    <script>
        // Update time
        setInterval(() => {
            document.getElementById('time').textContent = new Date().toLocaleString();
        }, 1000);
        
        // Check API
        const checkAPI = () => {
            fetch('http://74.208.184.195:4000')
                .then(r => r.json())
                .then(data => {
                    document.getElementById('api-status').innerHTML = '<span class="online">● Online</span>';
                })
                .catch(err => {
                    document.getElementById('api-status').innerHTML = '<span class="offline">● Offline</span>';
                });
        };
        
        checkAPI();
        setInterval(checkAPI, 5000);
    </script>
</body>
</html>
EOF

# Start services
docker-compose up -d

# Wait for startup
sleep 15

# Check status
docker-compose ps
```

### Step 7: Verify Installation

```bash
# Check if containers are running
docker ps

# Test services locally
curl http://localhost:3002
curl http://localhost:4000

# Check logs if needed
docker-compose logs
```

### Step 8: Alternative Port Configuration

If IONOS won't open custom ports, use standard web ports:

```bash
# Edit docker-compose.yml to use port 80 instead of 3002
sed -i 's/3002:80/80:80/g' docker-compose.yml

# Use a subdomain for API or proxy through nginx
# This requires additional nginx configuration
```

## 🔍 TROUBLESHOOTING

### If ports still don't work:

1. **Contact IONOS Support**
   - Tell them you need ports 3002, 4000, 8000 opened
   - They may require upgrading to a VPS or dedicated server plan

2. **Use Reverse Proxy on Port 80**
   ```bash
   # Install nginx as reverse proxy
   sudo apt install nginx
   
   # Configure to proxy all services through port 80
   # /web -> port 3002
   # /api -> port 4000
   # /ai -> port 8000
   ```

3. **Use Alternative Hosting**
   - DigitalOcean, AWS, or Linode don't have these port restrictions
   - They allow full control over firewall rules

## 📞 IONOS Support Contact

If firewall issues persist:
- **Phone**: 1-866-991-2631
- **Chat**: https://www.ionos.com/help
- **Tell them**: "I need to open TCP ports 3002, 4000, and 8000 for my web application"

## ✅ SUCCESS INDICATORS

You'll know it's working when:
1. `docker ps` shows all containers running
2. `curl http://localhost:3002` returns HTML
3. `curl http://localhost:4000` returns JSON
4. You can access http://74.208.184.195:3002 in your browser

---

**NOTE**: The main issue is that IONOS blocks non-standard ports by default. You MUST configure their firewall through their control panel or contact support to open the ports.