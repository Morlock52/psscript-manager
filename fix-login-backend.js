const express = require('express');
const cors = require('cors');
const app = express();

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  exposedHeaders: ['Content-Length', 'X-Request-Id']
};

app.use(cors(corsOptions));

// Enhanced JSON parsing with error handling
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf);
    } catch (err) {
      console.error('JSON Parse Error:', err.message);
      console.error('Raw body:', buf.toString());
      res.status(400).json({ 
        error: 'Invalid JSON format',
        message: 'Please check your request format'
      });
      return;
    }
  }
}));

app.use(express.urlencoded({ extended: true }));

// Enhanced logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    const logBody = { ...req.body };
    if (logBody.password) logBody.password = '***';
    console.log('Request body:', JSON.stringify(logBody));
  }
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Express Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date(),
    server: 'production',
    version: '1.0.2'
  });
});

// Enhanced login endpoint
app.post('/api/auth/login', (req, res) => {
  try {
    console.log('Login request received');
    console.log('Headers:', req.headers);
    console.log('Body type:', typeof req.body);
    console.log('Body:', req.body);

    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing email or password',
        received: { email: !!email, password: !!password }
      });
    }

    console.log(`Login attempt for: ${email}`);
    
    // Check credentials (supporting multiple valid passwords for testing)
    const validCredentials = [
      { email: 'admin@example.com', password: 'admin123!' },
      { email: 'admin@example.com', password: 'admin123' },
      { email: 'test@test.com', password: 'test123' }
    ];

    const isValid = validCredentials.some(cred => 
      cred.email === email && cred.password === password
    );

    if (isValid) {
      const token = Buffer.from(`${email}:${Date.now()}`).toString('base64');
      const response = {
        success: true,
        token: token,
        user: {
          id: 1,
          email: email,
          name: email === 'admin@example.com' ? 'Admin User' : 'Test User',
          role: email === 'admin@example.com' ? 'admin' : 'user'
        }
      };
      
      console.log('Login successful:', email);
      res.json(response);
    } else {
      console.log('Login failed - invalid credentials:', email);
      res.status(401).json({ 
        success: false,
        error: 'Invalid credentials',
        message: 'Please check your email and password',
        hint: 'Try: admin@example.com / admin123!'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login processing error',
      message: error.message
    });
  }
});

// User info endpoint
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  console.log('Auth check request, header:', authHeader);
  
  // For demo purposes, return user info
  res.json({
    id: 1,
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin'
  });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
  console.log('Logout request');
  res.json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
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

// Categories endpoint
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

// Settings endpoint
app.get('/api/settings', (req, res) => {
  res.json({
    app_name: 'PSScript Manager',
    version: '1.0.2',
    features: {
      upload_enabled: true,
      ai_analysis_enabled: true,
      community_features_enabled: true
    }
  });
});

// Test endpoint for debugging
app.post('/api/test', (req, res) => {
  console.log('Test endpoint hit');
  console.log('Body:', req.body);
  res.json({
    message: 'Test successful',
    received: req.body,
    timestamp: new Date()
  });
});

// Handle OPTIONS for CORS preflight
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Catch all API routes
app.all('/api/*', (req, res) => {
  console.log('Unhandled API route:', req.method, req.path);
  res.json({ 
    message: 'API endpoint ready',
    path: req.path,
    method: req.method,
    available_endpoints: [
      'GET /api/health',
      'POST /api/auth/login',
      'GET /api/auth/me',
      'POST /api/auth/logout',
      'GET /api/scripts',
      'GET /api/categories',
      'GET /api/settings',
      'POST /api/test'
    ]
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`PSScript Backend running on port ${PORT}`);
  console.log('Enhanced error handling enabled');
  console.log('Valid login credentials:');
  console.log('- admin@example.com / admin123!');
  console.log('- admin@example.com / admin123');
  console.log('- test@test.com / test123');
});