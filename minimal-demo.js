const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Handle API endpoints
  if (req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'PSScript Demo Server Running'
    }));
    return;
  }
  
  if (req.url === '/api/scripts') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([
      {
        id: 1,
        name: 'System Information',
        description: 'Gets detailed system information',
        content: 'Get-ComputerInfo | Select-Object WindowsProductName, TotalPhysicalMemory',
        created_at: new Date().toISOString(),
        is_public: true
      },
      {
        id: 2,
        name: 'Disk Space Check',
        description: 'Checks available disk space',
        content: 'Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, Size, FreeSpace',
        created_at: new Date().toISOString(),
        is_public: true
      }
    ]));
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, 'src/frontend/dist', req.url === '/' ? 'index.html' : req.url);
  
  // Security check - prevent directory traversal
  if (!filePath.startsWith(path.join(__dirname, 'src/frontend/dist'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // For SPA, serve index.html for any unknown routes
      filePath = path.join(__dirname, 'src/frontend/dist/index.html');
    }
    
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

const PORT = 3005;
server.listen(PORT, () => {
  console.log(`🚀 PSScript Minimal Demo Server running on http://localhost:${PORT}`);
  console.log('📊 Features available:');
  console.log('  ✅ Lazy Loading & Code Splitting');
  console.log('  ✅ Virtual Scrolling');
  console.log('  ✅ Security Enhancements');
  console.log('  ✅ Performance Optimizations');
  console.log('');
  console.log('📝 Demo endpoints:');
  console.log(`  • Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  • Scripts: http://localhost:${PORT}/api/scripts`);
  console.log(`  • Frontend: http://localhost:${PORT}/`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please stop the other service or use a different port.`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});