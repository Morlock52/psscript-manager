#!/bin/bash

# PSScript Server Setup Script
# Run this on Ubuntu 24.04 server before deployment

set -e

echo "🔧 PSScript Server Setup - Ubuntu 24.04"
echo "======================================"

# Update system
echo "📦 Updating system packages..."
apt-get update
apt-get upgrade -y

# Install essential packages
echo "📦 Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Node.js 20.x
echo "📦 Installing Node.js 20.x..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"

# Install PostgreSQL 16
echo "📦 Installing PostgreSQL 16..."
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt-get update
apt-get install -y postgresql-16 postgresql-client-16 postgresql-contrib-16

# Configure PostgreSQL
echo "🔧 Configuring PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Install pgvector extension
echo "📦 Installing pgvector extension..."
apt-get install -y postgresql-16-pgvector

# Enable pgvector
sudo -u postgres psql << EOF
CREATE EXTENSION IF NOT EXISTS vector;
EOF

# Install Redis
echo "📦 Installing Redis..."
apt-get install -y redis-server
systemctl start redis-server
systemctl enable redis-server

# Configure Redis
echo "🔧 Configuring Redis..."
sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
systemctl restart redis-server

# Install Nginx
echo "📦 Installing Nginx..."
apt-get install -y nginx
systemctl start nginx
systemctl enable nginx

# Install PM2
echo "📦 Installing PM2..."
npm install -g pm2

# Install build tools for native modules
echo "📦 Installing build tools for native modules..."
apt-get install -y python3-dev

# Setup firewall
echo "🔥 Setting up UFW firewall..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Create application user
echo "👤 Creating application user..."
useradd -m -s /bin/bash psscript || echo "User psscript already exists"

# Create application directories
echo "📁 Creating application directories..."
mkdir -p /var/www/psscript
mkdir -p /var/log/psscript
chown -R psscript:psscript /var/www/psscript
chown -R psscript:psscript /var/log/psscript

# Install monitoring tools
echo "📊 Installing monitoring tools..."
apt-get install -y htop iotop nethogs

# Install Certbot for SSL
echo "🔒 Installing Certbot..."
apt-get install -y certbot python3-certbot-nginx

# Setup log rotation
echo "📝 Setting up log rotation..."
cat > /etc/logrotate.d/psscript << EOF
/var/log/psscript/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 psscript psscript
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF

# System tuning for performance
echo "⚡ Optimizing system performance..."
cat >> /etc/sysctl.conf << EOF

# PSScript Performance Tuning
net.core.somaxconn = 65535
net.ipv4.tcp_max_tw_buckets = 1440000
net.ipv4.ip_local_port_range = 1024 65000
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_window_scaling = 1
net.ipv4.tcp_max_syn_backlog = 8192
net.ipv4.tcp_syncookies = 1
fs.file-max = 2097152
vm.swappiness = 10
EOF

sysctl -p

# Create swap file if not exists
echo "💾 Setting up swap file..."
if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

# Install fail2ban for security
echo "🔒 Installing fail2ban..."
apt-get install -y fail2ban
systemctl start fail2ban
systemctl enable fail2ban

# Create fail2ban configuration for nginx
cat > /etc/fail2ban/jail.local << EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true

[nginx-noproxy]
enabled = true
EOF

systemctl restart fail2ban

echo "✅ Server setup completed!"
echo ""
echo "📋 Installed components:"
echo "   - Node.js $(node --version)"
echo "   - npm $(npm --version)"
echo "   - PostgreSQL 16"
echo "   - Redis"
echo "   - Nginx"
echo "   - PM2"
echo "   - Certbot"
echo "   - UFW Firewall"
echo "   - Fail2ban"
echo ""
echo "🚀 Server is ready for PSScript deployment!"
echo "   Run ./deploy-to-server.sh to deploy the application"