# PSScript Website Test Report

**Date:** 2025-08-01T15:02:34.369Z
**URL:** http://localhost:3002
**API URL:** http://localhost:4005/api

## Summary

- **Total Tests:** 24
- **Passed:** 12
- **Failed:** 5
- **Warnings:** 0
- **Info:** 7

## Homepage

### ✅ Page Load
**Status:** PASS
**Details:**
```json
{
  "statusCode": 200
}
```

### ✅ Page Title
**Status:** PASS
**Details:**
```json
{
  "title": "PSScript - PowerShell Script Management"
}
```

### ❌ Navigation Present
**Status:** FAIL

### ❌ Main Content Present
**Status:** FAIL

## Navigation

### ℹ️ Links Found
**Status:** INFO
**Details:**
```json
{
  "count": 0,
  "links": []
}
```

## Authentication

### ❌ Login Form Present
**Status:** FAIL

## Interactive

### ℹ️ Buttons Found
**Status:** INFO
**Details:**
```json
{
  "count": 0,
  "buttons": []
}
```

### ℹ️ Links Found
**Status:** INFO
**Details:**
```json
{
  "count": 0
}
```

### ✅ All Links Valid
**Status:** PASS

## API

### ✅ Health Endpoint
**Status:** PASS
**Details:**
```json
{
  "status": 200,
  "ok": true,
  "data": {
    "dbStatus": "connected",
    "cacheStatus": "connected",
    "status": "healthy",
    "message": "",
    "time": "2025-08-01T15:02:41.925Z",
    "uptime": 1652.061877,
    "tables": [
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null
    ],
    "cache": {
      "size": 1,
      "keys": [
        "api:cache:/api"
      ],
      "hitRatio": 0,
      "memoryUsage": {
        "heapUsed": "60MB",
        "heapTotal": "64MB",
        "cacheEstimate": "0MB",
        "cachePercentage": "0%"
      },
      "topHits": []
    },
    "database": {
      "responseTime": 298,
      "connectionInfo": {
        "host": "localhost",
        "port": 5432,
        "database": "psscript",
        "connected": true,
        "isDocker": false
      },
      "serverInfo": {
        "database": "psscript",
        "server_time": "2025-08-01T15:02:41.820Z",
        "version": "PostgreSQL 16.9 (Homebrew) on aarch64-apple-darwin24.4.0, compiled by Apple clang version 17.0.0 (clang-1700.0.13.3), 64-bit",
        "db_size": "10 MB",
        "active_connections": "6"
      }
    },
    "environment": {
      "nodeEnv": "development",
      "dockerEnv": false,
      "port": "4005"
    },
    "isDocker": false,
    "platform": "darwin",
    "nodeVersion": "v22.16.0",
    "hostname": "Davids-MacBook-Air.local"
  }
}
```

### ℹ️ Endpoint /api/auth/login
**Status:** INFO
**Details:**
```json
{
  "status": 404,
  "ok": false,
  "statusText": "Not Found"
}
```

### ℹ️ Endpoint /api/users
**Status:** INFO
**Details:**
```json
{
  "status": 403,
  "ok": false,
  "statusText": "Forbidden"
}
```

### ℹ️ Endpoint /api/scripts
**Status:** INFO
**Details:**
```json
{
  "status": 200,
  "ok": true,
  "statusText": "OK"
}
```

## Responsive

### ✅ Mobile View
**Status:** PASS
**Details:**
```json
{
  "viewport": {
    "name": "Mobile",
    "width": 375,
    "height": 667
  },
  "navigationVisible": false
}
```

### ✅ Tablet View
**Status:** PASS
**Details:**
```json
{
  "viewport": {
    "name": "Tablet",
    "width": 768,
    "height": 1024
  },
  "navigationVisible": false
}
```

### ✅ Desktop View
**Status:** PASS
**Details:**
```json
{
  "viewport": {
    "name": "Desktop",
    "width": 1920,
    "height": 1080
  },
  "navigationVisible": false
}
```

## Accessibility

### ✅ All images have alt text
**Status:** PASS

### ✅ All form inputs have labels
**Status:** PASS

### ✅ Heading hierarchy correct
**Status:** PASS

### ℹ️ ARIA Landmarks
**Status:** INFO
**Details:**
```json
{
  "landmarks": {
    "banner": 0,
    "navigation": 0,
    "main": 0,
    "contentinfo": 0
  }
}
```

## Console

### ❌ JavaScript Errors
**Status:** FAIL
**Details:**
```json
{
  "count": 9,
  "errors": [
    {
      "type": "error",
      "text": "Failed to load resource: the server responded with a status of 404 (Not Found)",
      "location": {
        "url": "http://localhost:3002/@vite/client"
      }
    },
    {
      "type": "error",
      "text": "Failed to load resource: the server responded with a status of 404 (Not Found)",
      "location": {
        "url": "http://localhost:3002/@vite/client"
      }
    },
    {
      "type": "error",
      "text": "Failed to load resource: the server responded with a status of 404 (Not Found)",
      "location": {
        "url": "http://localhost:3002/@vite/client"
      }
    },
    {
      "type": "error",
      "text": "Failed to load resource: the server responded with a status of 404 (Not Found)",
      "location": {
        "url": "http://localhost:4005/api/auth/login"
      }
    },
    {
      "type": "error",
      "text": "Failed to load resource: the server responded with a status of 403 (Forbidden)",
      "location": {
        "url": "http://localhost:4005/api/users"
      }
    },
    {
      "type": "error",
      "text": "Failed to load resource: the server responded with a status of 404 (Not Found)",
      "location": {
        "url": "http://localhost:3002/@vite/client"
      }
    },
    {
      "type": "error",
      "text": "Failed to load resource: the server responded with a status of 404 (Not Found)",
      "location": {
        "url": "http://localhost:3002/@vite/client"
      }
    },
    {
      "type": "error",
      "text": "Failed to load resource: the server responded with a status of 404 (Not Found)",
      "location": {
        "url": "http://localhost:3002/@vite/client"
      }
    },
    {
      "type": "error",
      "text": "Failed to load resource: the server responded with a status of 404 (Not Found)",
      "location": {
        "url": "http://localhost:3002/@vite/client"
      }
    }
  ]
}
```

### ✅ No JavaScript Warnings
**Status:** PASS

## Page

### ✅ No Page Errors
**Status:** PASS

## Network

### ❌ Failed Requests
**Status:** FAIL
**Details:**
```json
{
  "count": 10,
  "failures": [
    {
      "url": "http://localhost:3002/@vite/client",
      "method": "GET",
      "failure": {
        "errorText": "net::ERR_ABORTED"
      }
    },
    {
      "url": "http://localhost:3002/@vite/client",
      "method": "GET",
      "failure": {
        "errorText": "net::ERR_ABORTED"
      }
    },
    {
      "url": "http://localhost:3002/@vite/client",
      "method": "GET",
      "failure": {
        "errorText": "net::ERR_ABORTED"
      }
    },
    {
      "url": "http://localhost:4005/api/auth/login",
      "method": "GET",
      "failure": {
        "errorText": "net::ERR_ABORTED"
      }
    },
    {
      "url": "http://localhost:4005/api/users",
      "method": "GET",
      "failure": {
        "errorText": "net::ERR_ABORTED"
      }
    },
    {
      "url": "http://localhost:4005/api/scripts",
      "method": "GET",
      "failure": {
        "errorText": "net::ERR_ABORTED"
      }
    },
    {
      "url": "http://localhost:3002/@vite/client",
      "method": "GET",
      "failure": {
        "errorText": "net::ERR_ABORTED"
      }
    },
    {
      "url": "http://localhost:3002/@vite/client",
      "method": "GET",
      "failure": {
        "errorText": "net::ERR_ABORTED"
      }
    },
    {
      "url": "http://localhost:3002/@vite/client",
      "method": "GET",
      "failure": {
        "errorText": "net::ERR_ABORTED"
      }
    },
    {
      "url": "http://localhost:3002/@vite/client",
      "method": "GET",
      "failure": {
        "errorText": "net::ERR_ABORTED"
      }
    }
  ]
}
```

## Screenshots

Screenshots have been saved to the test-results/website-tests directory:

- homepage.png - Homepage view
- login-form.png - Login form
- after-login.png - Post-login view
- responsive-mobile.png - Mobile view
- responsive-tablet.png - Tablet view
- responsive-desktop.png - Desktop view
