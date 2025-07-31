# PSScript Login Credentials

## 🔑 Quick Reference

### Development Mode (Current)
- **URL**: http://localhost:3002
- **Authentication**: **DISABLED** ⚠️
- **Access**: Direct access to all features without login

### Production Mode
When authentication is enabled:

```
Username: admin
Email: admin@example.com
Password: admin123!
```

## Authentication Status

### Check if Authentication is Required
```bash
curl http://localhost:4005/api/auth/status
```

### Current Middleware
The application uses dummy authentication middleware that:
- Automatically injects an admin user for all requests
- Bypasses actual login validation
- Allows full access to all features

### File Locations
- Auth middleware: `src/backend/src/middleware/authMiddleware.ts`
- Auth controller: `src/backend/src/controllers/AuthController.ts`  
- Default user seed: `src/db/seeds/01-initial-data.sql`

## Security Notes

🔒 **Important**: 
- Change default credentials immediately in production
- Enable proper authentication before deploying
- The current setup is for development only

## Quick Access

- **Frontend**: http://localhost:3002
- **Backend API**: http://localhost:4005/api/health
- **API Docs**: http://localhost:4005/api-docs

No login required in current development mode!