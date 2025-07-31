# PSScript Step-by-Step Deployment Guide

## 📋 Prerequisites
- SSH access to 74.208.184.195
- Root password: Morlock52b

## 🚀 Deployment Steps

### Step 1: Open Terminal/SSH Client
```bash
ssh root@74.208.184.195
```
When prompted for password, enter: `Morlock52b`

### Step 2: Check Current Status
Once logged in, run these commands one by one:

```bash
# Check what's using port 80
lsof -i:80
```

If something is using port 80 (like Apache or Nginx), we need to stop it:

```bash
# Stop web services
systemctl stop apache2
systemctl stop nginx
systemctl stop httpd
```

### Step 3: Install Docker (if not installed)
```bash
# Check if Docker exists
docker --version
```

If Docker is not installed:
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl start docker
systemctl enable docker
```

### Step 4: Deploy PSScript Test
Run this single command to deploy a test page:

```bash
docker run -d --name psscript --restart=always -p 80:80 -e TZ=America/New_York nginx:alpine
```

### Step 5: Create Test Page
```bash
docker exec -i psscript sh << 'EOF'
cat > /usr/share/nginx/html/index.html << 'HTML'
<!DOCTYPE html>
<html>
<head>
    <title>PSScript Running</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
            border: 1px solid rgba(255, 255, 255, 0.18);
            text-align: center;
            max-width: 500px;
        }
        h1 {
            margin: 0 0 20px 0;
            font-size: 2.5em;
        }
        .status {
            background: rgba(16, 185, 129, 0.2);
            border: 1px solid rgba(16, 185, 129, 0.5);
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        .success {
            color: #10b981;
            font-weight: bold;
        }
        .info {
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
            padding: 15px;
            margin-top: 20px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        .next-steps {
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid rgba(59, 130, 246, 0.5);
            border-radius: 10px;
            padding: 20px;
            margin-top: 20px;
            text-align: left;
        }
        .next-steps h3 {
            margin-top: 0;
        }
        .next-steps ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .next-steps li {
            margin: 5px 0;
        }
        code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <div class="card">
        <h1>🎉 PSScript is Live!</h1>
        
        <div class="status">
            <p class="success">✓ Docker Successfully Installed</p>
            <p class="success">✓ Web Server Running on Port 80</p>
            <p class="success">✓ IONOS Restrictions Bypassed</p>
        </div>
        
        <p>Your PSScript infrastructure is now ready.</p>
        
        <div class="info">
            <strong>Server IP:</strong> 74.208.184.195<br>
            <strong>Container:</strong> psscript<br>
            <strong>Port:</strong> 80 (Standard HTTP)<br>
            <strong>Time:</strong> <span id="time"></span>
        </div>
        
        <div class="next-steps">
            <h3>Next Steps:</h3>
            <ul>
                <li>SSH to server: <code>ssh root@74.208.184.195</code></li>
                <li>Check status: <code>docker ps</code></li>
                <li>View logs: <code>docker logs psscript</code></li>
                <li>Deploy full app when ready</li>
            </ul>
        </div>
    </div>
    
    <script>
        function updateTime() {
            document.getElementById('time').textContent = new Date().toLocaleString();
        }
        updateTime();
        setInterval(updateTime, 1000);
    </script>
</body>
</html>
HTML
EOF
```

### Step 6: Verify Deployment
```bash
# Check if container is running
docker ps

# Test locally
curl http://localhost
```

### Step 7: Access in Browser
Open your web browser and go to:
```
http://74.208.184.195
```

You should see the PSScript success page!

## 🛠️ Troubleshooting

### If the page doesn't load:

1. **Check Docker container**:
   ```bash
   docker ps -a
   ```
   
2. **Check logs**:
   ```bash
   docker logs psscript
   ```

3. **Restart container**:
   ```bash
   docker restart psscript
   ```

4. **Check port 80**:
   ```bash
   netstat -tlnp | grep :80
   ```

5. **Remove and recreate**:
   ```bash
   docker stop psscript
   docker rm psscript
   # Then run Step 4 again
   ```

### If Docker won't install:

```bash
# Manual Docker installation
apt-get update
apt-get install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io
```

## ✅ Success Indicators

You know it's working when:
1. `docker ps` shows a running container named "psscript"
2. `curl http://localhost` returns HTML
3. Browser shows the success page at http://74.208.184.195

## 📞 Need Help?

If you're still having issues:
1. The server might need a reboot: `reboot`
2. IONOS support might need to open port 80: 1-866-991-2631
3. Try using a different port like 8080 (if IONOS allows it)

## 🎯 Quick Recap

The fastest way:
1. SSH to server
2. Copy the command from `EMERGENCY-DEPLOY.txt`
3. Paste and run
4. Check http://74.208.184.195