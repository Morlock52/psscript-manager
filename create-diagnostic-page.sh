#!/bin/bash

# Create a diagnostic page to help identify login issues
set -e

echo "🔧 Creating diagnostic page..."

SERVER_IP="74.208.184.195"
SERVER_USER="root"
SERVER_PASS="Morlock52"

# Create a simple diagnostic HTML page
cat > diagnostic.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>PSScript Login Diagnostic</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .test-box { background: #f8f9fa; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #007bff; }
        .success { border-left-color: #28a745; background: #d4edda; }
        .error { border-left-color: #dc3545; background: #f8d7da; }
        button { padding: 12px 20px; margin: 10px 5px; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; }
        .btn-primary { background: #007bff; color: white; }
        .btn-success { background: #28a745; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        input { padding: 10px; margin: 5px; border: 1px solid #ddd; border-radius: 4px; width: 200px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px; }
        .status { display: inline-block; width: 20px; height: 20px; border-radius: 50%; margin-right: 10px; }
        .status.ok { background: #28a745; }
        .status.fail { background: #dc3545; }
        .status.loading { background: #ffc107; animation: pulse 1s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 PSScript Login Diagnostic</h1>
        <p>This page will help identify what's wrong with the login system.</p>
        
        <div class="test-box">
            <h3><span class="status loading" id="status1"></span>Test 1: Backend Health Check</h3>
            <div id="test1-result">Testing...</div>
        </div>
        
        <div class="test-box">
            <h3><span class="status loading" id="status2"></span>Test 2: CORS Configuration</h3>
            <div id="test2-result">Testing...</div>
        </div>
        
        <div class="test-box">
            <h3><span class="status loading" id="status3"></span>Test 3: Login API</h3>
            <div id="test3-result">Testing...</div>
        </div>
        
        <div class="test-box">
            <h3>🧪 Manual Login Test</h3>
            <div>
                <input type="email" id="email" placeholder="Email" value="admin@example.com">
                <input type="password" id="password" placeholder="Password" value="admin123">
                <button class="btn-primary" onclick="testLogin()">Test Login</button>
            </div>
            <div id="manual-result"></div>
        </div>
        
        <div class="test-box">
            <h3>📊 System Information</h3>
            <div id="system-info">
                <strong>Current URL:</strong> <span id="current-url"></span><br>
                <strong>User Agent:</strong> <span id="user-agent"></span><br>
                <strong>Server:</strong> <span id="server-url"></span>
            </div>
        </div>
        
        <div class="test-box">
            <h3>🚀 Quick Actions</h3>
            <button class="btn-success" onclick="goToApp()">Go to Main App</button>
            <button class="btn-primary" onclick="openDirectIP()">Open Direct IP</button>
            <button class="btn-primary" onclick="openDomain()">Open Domain</button>
        </div>
    </div>
    
    <script>
        const serverUrl = window.location.hostname === 'localhost' || window.location.hostname.includes('192.168') 
            ? 'http://74.208.184.195' 
            : window.location.origin;
            
        // Update system info
        document.getElementById('current-url').textContent = window.location.href;
        document.getElementById('user-agent').textContent = navigator.userAgent;
        document.getElementById('server-url').textContent = serverUrl;
        
        async function runTest(testNum, testName, testFn) {
            const statusEl = document.getElementById(`status${testNum}`);
            const resultEl = document.getElementById(`test${testNum}-result`);
            
            statusEl.className = 'status loading';
            resultEl.innerHTML = 'Testing...';
            
            try {
                const result = await testFn();
                statusEl.className = 'status ok';
                resultEl.innerHTML = `<strong>✅ PASSED:</strong> ${result}`;
                return true;
            } catch (error) {
                statusEl.className = 'status fail';
                resultEl.innerHTML = `<strong>❌ FAILED:</strong> ${error.message}<br><pre>${error.stack || error}</pre>`;
                return false;
            }
        }
        
        async function test1() {
            const response = await fetch(`${serverUrl}/api/health`);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            const data = await response.json();
            return `Backend is healthy (v${data.version})`;
        }
        
        async function test2() {
            const response = await fetch(`${serverUrl}/api/auth/login`, {
                method: 'OPTIONS',
                headers: {
                    'Origin': window.location.origin,
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                }
            });
            if (!response.ok) throw new Error(`CORS preflight failed: ${response.status}`);
            return 'CORS is properly configured';
        }
        
        async function test3() {
            const response = await fetch(`${serverUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    email: 'admin@example.com',
                    password: 'admin123'
                })
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HTTP ${response.status}: ${text}`);
            }
            
            const data = await response.json();
            if (!data.success) throw new Error(`Login failed: ${data.error}`);
            
            return `Login successful! Token: ${data.token.substring(0, 20)}...`;
        }
        
        async function testLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const resultEl = document.getElementById('manual-result');
            
            resultEl.innerHTML = '<div style="color: blue;">⏳ Testing login...</div>';
            
            try {
                const response = await fetch(`${serverUrl}/api/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });
                
                const data = await response.json();
                
                if (response.ok && data.success) {
                    resultEl.innerHTML = `
                        <div style="color: green; margin-top: 10px;">
                            <strong>✅ SUCCESS!</strong><br>
                            User: ${data.user.name}<br>
                            Role: ${data.user.role}<br>
                            Token: ${data.token.substring(0, 30)}...
                        </div>
                    `;
                    
                    // Store token and redirect after 2 seconds
                    localStorage.setItem('psscript_token', data.token);
                    setTimeout(() => {
                        window.location.href = serverUrl;
                    }, 2000);
                } else {
                    resultEl.innerHTML = `
                        <div style="color: red; margin-top: 10px;">
                            <strong>❌ FAILED</strong><br>
                            ${data.error || data.message || 'Unknown error'}
                        </div>
                    `;
                }
            } catch (error) {
                resultEl.innerHTML = `
                    <div style="color: red; margin-top: 10px;">
                        <strong>❌ ERROR</strong><br>
                        ${error.message}
                    </div>
                `;
            }
        }
        
        function goToApp() {
            window.location.href = serverUrl;
        }
        
        function openDirectIP() {
            window.open('http://74.208.184.195', '_blank');
        }
        
        function openDomain() {
            window.open('https://psscript.morloksmaze.com', '_blank');
        }
        
        // Run all tests
        async function runAllTests() {
            await runTest(1, 'Backend Health', test1);
            await runTest(2, 'CORS Configuration', test2);
            await runTest(3, 'Login API', test3);
        }
        
        // Start tests when page loads
        window.addEventListener('load', runAllTests);
    </script>
</body>
</html>
EOF

echo "📤 Uploading diagnostic page to server..."

# Upload diagnostic page
sshpass -p "$SERVER_PASS" scp diagnostic.html $SERVER_USER@$SERVER_IP:/opt/psscript/dist/

echo "✅ Diagnostic page created!"
echo ""
echo "🔍 Access the diagnostic page at:"
echo "• http://74.208.184.195/diagnostic.html"
echo "• https://psscript.morloksmaze.com/diagnostic.html"
echo ""
echo "This page will:"
echo "• Test all backend endpoints"
echo "• Check CORS configuration"
echo "• Provide manual login testing"
echo "• Show detailed error messages"
echo "• Help identify what's not working"

# Cleanup
rm -f diagnostic.html