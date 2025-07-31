const express = require('express');
const path = require('path');
const app = express();

// Static files from frontend dist
app.use(express.static(path.join(__dirname, 'src/frontend/dist')));

// Mock API endpoints for demo
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ 
    user: { 
      id: 1, 
      username: 'demo-user', 
      email: 'demo@psscript.com' 
    } 
  });
});

app.get('/api/scripts', (req, res) => {
  res.json([
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
  ]);
});

// Catch-all handler for SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/frontend/dist/index.html'));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`🚀 PSScript Demo Server running on http://localhost:${PORT}`);
  console.log('📊 Features available:');
  console.log('  ✅ Lazy Loading & Code Splitting');
  console.log('  ✅ Virtual Scrolling');
  console.log('  ✅ Security Enhancements');
  console.log('  ✅ Performance Optimizations');
});