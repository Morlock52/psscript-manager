# PSScript Quick Start Guide

## Starting the Application

### 1. Start Backend Server
```bash
cd src/backend
npm run dev
```

### 2. Start Frontend Server
```bash
cd src/frontend
npm run dev
```

### 3. Access the Application
Open your browser to: **http://localhost:5173**

## Login & Authentication

### Option 1: Use Without Login (Default)
- The application works without authentication
- Chat uses mock responses or your OpenAI API key from localStorage
- Limited features available

### Option 2: Create an Account
1. Click **"Register"** in the sidebar (or go to http://localhost:5173/register)
2. Fill in:
   - Username (e.g., `testuser`)
   - Email (e.g., `test@example.com`)
   - Password (minimum 8 characters, e.g., `TestPass123!`)
3. Click "Create account"

### Option 3: Login with Existing Account
1. Click **"Login"** in the sidebar (or go to http://localhost:5173/login)
2. Enter your email and password
3. Click "Sign in"

## Features Available

### Without Authentication
- ✅ Chat with AI (mock or OpenAI)
- ✅ View scripts
- ✅ Basic navigation
- ❌ Save chat history
- ❌ Secure storage
- ❌ User-specific features

### With Authentication
- ✅ All unauthenticated features
- ✅ Save chat history
- ✅ Secure API key storage
- ✅ Upload and manage scripts
- ✅ User profile
- ✅ Advanced features

## Troubleshooting

### Chrome Extension Errors
Ignore these errors - they're from a browser extension, not your app:
```
GET chrome-extension://pejdijmoenmkgeppbflobdenhhabjlaj/utils.js net::ERR_FILE_NOT_FOUND
```

### Can't See Login/Register?
The sidebar should show:
- **Login** and **Register** buttons when not authenticated
- **Logout** button and user info when authenticated

### Backend Not Running?
Check if backend is running:
```bash
curl http://localhost:4000/health
```

Should return: `{"status":"ok","timestamp":"..."}`

## Next Steps

1. **Configure OpenAI API Key**:
   - Go to Settings
   - Enter your OpenAI API key
   - Save

2. **Try the Chat**:
   - Navigate to "Chat with AI"
   - Ask: "Help me write a PowerShell script"

3. **Upload a Script**:
   - Go to "Script Management"
   - Click "Upload Script"
   - Select a .ps1 file

4. **Explore AI Features**:
   - Script analysis
   - Code generation
   - Best practices recommendations

## Quick Test Commands

```bash
# Test backend health
curl http://localhost:4000/health

# Test API status
curl http://localhost:4000/api/settings/ai-status

# Create test user (adjust data as needed)
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"TestPass123!"}'
```