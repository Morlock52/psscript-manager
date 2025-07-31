#!/bin/bash

# Configure PSScript for Domain Access
set -e

echo "🌐 Configuring PSScript for Domain Access..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"
DOMAIN="${1:-psscript.morloksmaze.com}"

echo "📝 Configuring for domain: $DOMAIN"

# Create updated backend with proper CORS
cat > backend-with-cors.js << 'EOF'
const express = require('express');
const cors = require('cors');
const app = express();

// Configure CORS to accept requests from any origin
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Allow all origins in production for now
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'X-Request-Id']
};

app.use(cors(corsOptions));
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    server: 'production',
    version: '1.0.1'
  });
});

// Auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt:', { email, password: '***' });
  
  if (email === 'admin@example.com' && password === 'admin123!') {
    const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    res.json({
      success: true,
      token: token,
      user: {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'admin'
      }
    });
    console.log('Login successful for:', email);
  } else {
    console.log('Login failed for:', email);
    res.status(401).json({ 
      success: false,
      error: 'Invalid credentials',
      message: 'Please use: admin@example.com / admin123!'
    });
  }
});

app.get('/api/auth/me', (req, res) => {
  // For demo, always return user
  res.json({
    id: 1,
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin'
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// Scripts endpoints
app.get('/api/scripts', (req, res) => {
  res.json({
    scripts: [
      {
        id: 1,
        name: 'System Health Monitor',
        description: 'Monitors system health and sends alerts',
        category: 'Monitoring',
        author: 'Admin',
        downloads: 145,
        rating: 4.8,
        created_at: new Date('2025-01-15'),
        updated_at: new Date('2025-07-20')
      },
      {
        id: 2,
        name: 'Automated Backup Manager',
        description: 'Handles automated backups with versioning',
        category: 'Maintenance',
        author: 'Admin',
        downloads: 89,
        rating: 4.9,
        created_at: new Date('2025-02-20'),
        updated_at: new Date('2025-07-25')
      },
      {
        id: 3,
        name: 'Active Directory User Sync',
        description: 'Syncs users between AD and cloud services',
        category: 'Administration',
        author: 'Admin',
        downloads: 234,
        rating: 4.7,
        created_at: new Date('2025-03-10'),
        updated_at: new Date('2025-07-30')
      }
    ],
    total: 3,
    page: 1,
    limit: 10
  });
});

// Categories
app.get('/api/categories', (req, res) => {
  res.json({
    categories: [
      { id: 1, name: 'Monitoring', script_count: 15, icon: '📊' },
      { id: 2, name: 'Maintenance', script_count: 23, icon: '🔧' },
      { id: 3, name: 'Administration', script_count: 31, icon: '👥' },
      { id: 4, name: 'Security', script_count: 18, icon: '🔒' },
      { id: 5, name: 'Networking', script_count: 12, icon: '🌐' }
    ]
  });
});

// Settings
app.get('/api/settings', (req, res) => {
  res.json({
    app_name: 'PSScript Manager',
    version: '1.0.1',
    features: {
      upload_enabled: true,
      ai_analysis_enabled: true,
      community_features_enabled: true
    }
  });
});

// Handle OPTIONS for CORS preflight
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Catch all API routes
app.all('/api/*', (req, res) => {
  console.log('Unhandled API route:', req.method, req.path);
  res.json({ 
    message: 'API endpoint ready',
    path: req.path,
    method: req.method 
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`PSScript Backend running on port ${PORT}`);
  console.log('CORS enabled for all origins');
  console.log('Login: admin@example.com / admin123!');
});
EOF

# Create nginx config that works with domain
cat > nginx-domain.conf << EOF
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Enable gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    # Logging
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;

    server {
        listen 80;
        server_name $DOMAIN $SERVER_IP localhost;
        
        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        
        # Frontend
        location / {
            root /usr/share/nginx/html;
            try_files \$uri \$uri/ /index.html;
            
            # Cache static assets
            location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
                expires 1y;
                add_header Cache-Control "public, immutable";
            }
        }
        
        # API proxy with CORS handling
        location /api {
            # Handle preflight requests
            if (\$request_method = 'OPTIONS') {
                add_header 'Access-Control-Allow-Origin' '*' always;
                add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
                add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
                add_header 'Access-Control-Max-Age' 1728000;
                add_header 'Content-Type' 'text/plain; charset=utf-8';
                add_header 'Content-Length' 0;
                return 204;
            }
            
            proxy_pass http://backend:4000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host \$host;
            proxy_cache_bypass \$http_upgrade;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
            proxy_set_header X-Forwarded-Host \$host;
            
            # Add CORS headers to responses
            add_header 'Access-Control-Allow-Origin' '*' always;
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
            add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;
        }
        
        # Health check
        location /health {
            access_log off;
            return 200 "OK\n";
            add_header Content-Type text/plain;
        }
        
        # Server info
        location /info {
            return 200 "PSScript Server\nDomain: $DOMAIN\nVersion: 1.0.1\n";
            add_header Content-Type text/plain;
        }
    }
}
EOF

echo "📤 Deploying configuration..."

# Upload files
sshpass -p "$SERVER_PASS" scp backend-with-cors.js nginx-domain.conf $SERVER_USER@$SERVER_IP:/opt/psscript/

# Apply configuration
sshpass -p "$SERVER_PASS" ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd /opt/psscript

# Backup current config
cp docker-compose.yml docker-compose.yml.bak

# Update backend
cp backend-with-cors.js mock-backend-fixed.js

# Update nginx config
cp nginx-domain.conf nginx.conf

# Restart services
docker-compose restart

echo "⏳ Waiting for services to start..."
sleep 15

echo "🔍 Testing configuration..."
echo ""
echo "1. Health check:"
curl -s http://localhost/api/health | jq .

echo ""
echo "2. Testing login:"
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123!"}' | jq .

echo ""
echo "3. Server info:"
curl -s http://localhost/info

echo ""
echo "✅ Configuration complete!"
ENDSSH

# Cleanup
rm -f backend-with-cors.js nginx-domain.conf

echo ""
echo "✅ Domain configuration complete!"
echo ""
echo "📝 DNS Configuration Required:"
echo "================================"
echo "Add an A record for your domain:"
echo "Host: psscript (or @)"
echo "Type: A"
echo "Value: $SERVER_IP"
echo "================================"
echo ""
echo "🌐 Access your application at:"
echo "- http://$DOMAIN (once DNS is configured)"
echo "- http://$SERVER_IP (direct IP access)"
echo ""
echo "📧 Login Credentials:"
echo "Email: admin@example.com"
echo "Password: admin123!"