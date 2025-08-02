# Fix PSScript Deployment on 74.208.184.195

## 🚨 **Current Issue**
Server at 74.208.184.195 is completely unreachable:
- SSH connection timeout
- All ports (22, 80, 8080, 3000) unreachable
- Server appears down or network isolated

## 🔧 **Server Recovery Plan**

### Option 1: Cloud Provider Console Access
1. **Access your cloud provider dashboard** (AWS, DigitalOcean, Linode, etc.)
2. **Check server status** - Is it running?
3. **Restart the server** if it's stopped
4. **Check firewall rules** in cloud console
5. **Verify IP address** hasn't changed

### Option 2: Alternative Server Access
If you have console access or KVM:
1. **Boot into recovery mode**
2. **Check network configuration**
3. **Restart networking services**
4. **Check iptables/ufw rules**

### Option 3: Redeploy to Working Server
If the server is permanently down:
1. **Get new server with same IP** or
2. **Deploy to new server** and update DNS

## 🚀 **Recovery Commands** (Once server is accessible)

### Step 1: Restart All Services
```bash
# SSH into server
ssh root@74.208.184.195

# Restart core services
systemctl restart nginx
systemctl restart postgresql
systemctl restart redis-server

# Check PM2 backend
pm2 restart all
pm2 status

# Check all service status
systemctl status nginx --no-pager
systemctl status postgresql --no-pager
systemctl status redis-server --no-pager
```

### Step 2: Fix Firewall
```bash
# Reset UFW to known good state
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw allow 8080
ufw allow 3000
ufw --force enable

# Check what's listening
netstat -tlnp | grep -E ":80|:8080|:3000"
```

### Step 3: Restart Application
```bash
cd /var/www/psscript/src/backend
pm2 restart psscript-backend
pm2 logs psscript-backend --lines 20

# Test nginx
curl -I http://localhost:8080
curl -I http://localhost:3000
```

## 🌐 **DNS Configuration for psscript.morlocksmaze.com**

### Current Server (74.208.184.195)
Add this A record to your DNS provider:
```
Type: A
Name: psscript
Value: 74.208.184.195
TTL: 300
```

### If Server IP Changes
Update the A record with the new IP address.

## 🔍 **Diagnostic Commands**

### Test from your local machine:
```bash
# Test ping
ping -c 3 74.208.184.195

# Test specific ports
nc -zv 74.208.184.195 22
nc -zv 74.208.184.195 80
nc -zv 74.208.184.195 8080

# Test HTTP
curl -I http://74.208.184.195:8080 --connect-timeout 10
```

### On the server (when accessible):
```bash
# Check what's listening
ss -tlnp

# Check logs
journalctl -u nginx -n 50
journalctl -u postgresql -n 50
pm2 logs --lines 50

# Check disk space
df -h

# Check memory
free -h

# Check processes
ps aux | grep -E "nginx|postgres|redis|node"
```

## 🎯 **Recovery Actions Needed**

1. **Immediate**: Access cloud provider console to restart server
2. **Check**: Verify server is running and accessible
3. **Restart**: All services (nginx, postgresql, redis, pm2)
4. **Test**: Application accessibility on port 8080
5. **Configure**: DNS A record pointing psscript.morlocksmaze.com to 74.208.184.195
6. **Verify**: Site loads at https://psscript.morlocksmaze.com

## 📋 **Quick Recovery Script** (Run when server is accessible)

```bash
#!/bin/bash
# Save as: fix-server.sh

echo "🔧 PSScript Server Recovery"
echo "=========================="

# Restart all services
systemctl restart nginx postgresql redis-server

# Check PM2
pm2 restart all

# Fix firewall
ufw allow 80,443,8080,3000/tcp

# Test connectivity
curl -I http://localhost:8080

echo "✅ Recovery complete. Test external access."
```

## ⚠️ **If Server Cannot Be Recovered**

If the server at 74.208.184.195 is permanently unreachable, I can:
1. **Deploy to a new server** with the same configuration
2. **Update DNS** to point to the new server IP
3. **Migrate all data** and configurations

The application code is ready and will work once the server infrastructure is restored.