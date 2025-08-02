# Immediate Security Patches for PSScript

## Critical Security Issues to Fix IMMEDIATELY

Based on the troubleshooting report, these are the most critical security vulnerabilities that need immediate attention:

### 🚨 CRITICAL: Unauthenticated User Data Exposure

**Issue**: `GET /api/auth/me` returns admin user details without authentication
**Risk Level**: CRITICAL
**Impact**: Complete user data breach

#### Immediate Fix:
```javascript
// src/backend/routes/auth.js - Add authentication middleware
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Protect the /me endpoint
router.get('/me', requireAuth, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role
  });
});
```

### 🚨 CRITICAL: POST Method Blocking

**Issue**: Server rejects all POST requests with "Only GET requests are allowed"
**Risk Level**: CRITICAL
**Impact**: Authentication and upload functionality completely broken

#### Immediate Fix - Nginx Configuration:
```nginx
# /etc/nginx/sites-available/psscript
server {
    listen 443 ssl http2;
    server_name psscript.morloksmaze.com;
    
    # SSL Configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    # Allow all HTTP methods
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Critical: Allow POST, PUT, DELETE methods
        proxy_method $request_method;
        client_max_body_size 50M;
    }
    
    # Static files
    location / {
        root /var/www/psscript/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

#### Alternative Fix - Express.js CORS:
```javascript
// src/backend/index.js - Ensure CORS allows all methods
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://psscript.morloksmaze.com',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Ensure body parsing for POST requests
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
```

### 🚨 HIGH: Production Debug Information Leakage

**Issue**: Console logs and debug information exposed in production
**Risk Level**: HIGH
**Impact**: Internal system information disclosure

#### Immediate Fix:
```javascript
// Add to webpack.config.js or vite.config.js
export default {
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
}

// Replace all console.log statements with:
if (__DEV__) {
  console.log('Debug information here');
}

// Or use a logging library:
import { createLogger } from './utils/logger';
const logger = createLogger();
logger.debug('This only shows in development');
```

### 🛡️ HIGH: HTTPS Enforcement

**Issue**: No automatic HTTPS redirect
**Risk Level**: HIGH
**Impact**: Potential man-in-the-middle attacks

#### Immediate Fix - Nginx:
```nginx
# Force HTTPS redirect
server {
    listen 80;
    server_name psscript.morloksmaze.com;
    return 301 https://$server_name$request_uri;
}
```

#### Alternative Fix - Express.js:
```javascript
// src/backend/index.js
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

## Quick Deployment Script

```bash
#!/bin/bash
# immediate-security-fixes.sh

echo "🚨 Applying CRITICAL security patches..."

# 1. Update Nginx configuration
sudo cp nginx-secure.conf /etc/nginx/sites-available/psscript
sudo nginx -t && sudo systemctl reload nginx

# 2. Add authentication middleware
cd src/backend
npm install jsonwebtoken bcryptjs
cp auth-middleware.js routes/
node update-auth-routes.js

# 3. Remove debug logs from production build
cd ../frontend
npm install --production
npm run build:secure

# 4. Restart services
sudo systemctl restart psscript-backend
sudo systemctl reload nginx

echo "✅ Critical security patches applied!"
echo "⚠️  Please test login functionality immediately"
```

## Immediate Testing Checklist

### Authentication Tests:
```bash
# Test 1: Unauthenticated access should be blocked
curl -X GET https://psscript.morloksmaze.com/api/auth/me
# Expected: 401 Unauthorized

# Test 2: POST login should work
curl -X POST https://psscript.morloksmaze.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"admin123!"}'
# Expected: 200 with JWT token

# Test 3: Authenticated access should work
curl -X GET https://psscript.morloksmaze.com/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
# Expected: 200 with user data
```

### HTTP Method Tests:
```bash
# Test 4: POST to upload should work
curl -X POST https://psscript.morloksmaze.com/api/scripts/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"test","content":"Write-Host Hello"}'
# Expected: 200 success

# Test 5: HTTPS redirect should work
curl -I http://psscript.morloksmaze.com
# Expected: 301 redirect to https://
```

## Emergency Rollback Plan

If any patch breaks the application:

```bash
#!/bin/bash
# rollback-security-patches.sh

echo "🔄 Rolling back security patches..."

# Restore original Nginx config
sudo cp nginx-original.conf.backup /etc/nginx/sites-available/psscript
sudo nginx -t && sudo systemctl reload nginx

# Restore original backend code
cd src/backend
git checkout HEAD~1 routes/auth.js

# Restart services  
sudo systemctl restart psscript-backend

echo "✅ Rollback complete - but SECURITY ISSUES REMAIN!"
```

## Long-term Security Roadmap

After applying these immediate patches:

1. **Week 1**: Implement proper JWT refresh token system
2. **Week 2**: Add rate limiting and input validation
3. **Week 3**: Security audit and penetration testing
4. **Week 4**: Begin migration to Next.js architecture

## Monitoring After Patches

Set up immediate monitoring:

```javascript
// Add to backend for security monitoring
app.use((req, res, next) => {
  if (req.path.includes('/api/auth/me') && !req.headers.authorization) {
    console.error(`SECURITY: Unauthorized access attempt from ${req.ip}`);
  }
  next();
});
```

## Critical Success Metrics

After applying patches, verify:
- ✅ No unauthenticated access to `/api/auth/me`
- ✅ POST requests work for login and upload
- ✅ HTTPS enforced on all requests
- ✅ No debug information in production logs
- ✅ Authentication flow works end-to-end

**⚠️ IMPORTANT**: These are temporary fixes. The full Next.js redesign should be prioritized for comprehensive security and modern architecture.