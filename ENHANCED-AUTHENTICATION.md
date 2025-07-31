# Enhanced Authentication for PSScript

This document describes the enhanced authentication features implemented for the PSScript project.

## Features Overview

### 1. Multi-Factor Authentication (MFA)
- **TOTP Support**: Time-based One-Time Password using authenticator apps
- **QR Code Generation**: Easy setup with QR codes for authenticator apps
- **Backup Codes**: Recovery codes for account access if MFA device is lost
- **Manual Entry**: Support for manual secret key entry

### 2. OAuth2 Integration
Supported providers:
- **Google**: Sign in with Google account
- **GitHub**: Sign in with GitHub account
- **Microsoft**: Sign in with Microsoft account

### 3. Session Management
- **Active Session Tracking**: View all active sessions across devices
- **Session Revocation**: Ability to revoke specific sessions
- **Session Details**: IP address, device info, last activity
- **Automatic Cleanup**: Expired sessions are automatically cleaned up

### 4. Enhanced Password Security
- **Complexity Requirements**:
  - Minimum 12 characters
  - Uppercase and lowercase letters
  - Numbers and special characters
  - No common passwords
  - No user information in password
- **Password Strength Meter**: Real-time feedback on password strength
- **Crack Time Estimation**: Shows estimated time to crack password

### 5. Account Security
- **Account Lockout**: Automatic lockout after 5 failed login attempts
- **Configurable Lock Duration**: Default 30 minutes
- **Password Reset**: Secure token-based password reset
- **Email Verification**: Verify email addresses for new accounts

### 6. JWT Token Management
- **Access Tokens**: Short-lived tokens (15 minutes default)
- **Refresh Tokens**: Long-lived tokens (7 days default)
- **Automatic Refresh**: Tokens refresh automatically before expiration
- **Secure Storage**: Refresh tokens stored securely in database

### 7. Granular Permissions
- **Role-Based Access Control (RBAC)**: Default roles (user, admin)
- **Permission System**: Fine-grained permissions for resources
- **Dynamic Permission Checks**: Runtime permission validation
- **User-Specific Permissions**: Override role permissions per user

### 8. Audit Logging
- **Authentication Events**: Track all auth-related events
- **Failed Login Attempts**: Monitor suspicious activity
- **Permission Changes**: Track permission modifications
- **Session Activity**: Log session creation and revocation

## Setup Instructions

### 1. Run Database Migration

```bash
./run-auth-enhancement-migration.sh
```

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# JWT Configuration
JWT_SECRET=your-secure-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# OAuth Configuration
APP_URL=http://localhost:4001
FRONTEND_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# GitHub OAuth
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Microsoft OAuth
MICROSOFT_CLIENT_ID=your-microsoft-client-id
MICROSOFT_CLIENT_SECRET=your-microsoft-client-secret

# Security Configuration
ACCOUNT_LOCK_DURATION=30  # minutes
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5

# Redis Configuration (for sessions)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_DB=1
```

### 3. OAuth Provider Setup

#### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:4001/api/auth/google/callback`

#### GitHub OAuth
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Set Authorization callback URL: `http://localhost:4001/api/auth/github/callback`

#### Microsoft OAuth
1. Go to [Azure Portal](https://portal.azure.com/)
2. Register a new application
3. Add redirect URI: `http://localhost:4001/api/auth/microsoft/callback`
4. Create a client secret

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with email/password (supports MFA)
- `POST /api/auth/register` - Register new account
- `POST /api/auth/logout` - Logout current session
- `POST /api/auth/refresh-token` - Refresh access token

### MFA
- `POST /api/auth/mfa/setup` - Initialize MFA setup
- `POST /api/auth/mfa/verify` - Verify and enable MFA
- `POST /api/auth/mfa/disable` - Disable MFA

### OAuth
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/microsoft` - Initiate Microsoft OAuth

### Sessions
- `GET /api/auth/sessions` - Get all active sessions
- `DELETE /api/auth/sessions/:sessionId` - Revoke specific session

### Password Management
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/change-password` - Change password (authenticated)

## Frontend Integration

### Using Enhanced Auth Context

```typescript
import { useEnhancedAuth } from './hooks/useEnhancedAuth';

function MyComponent() {
  const { 
    user, 
    login, 
    logout, 
    hasPermission,
    setupMFA 
  } = useEnhancedAuth();

  // Check permissions
  if (hasPermission('scripts.write')) {
    // User can create/edit scripts
  }

  // Handle login with MFA
  const handleLogin = async (email, password) => {
    const result = await login(email, password);
    if (result.requiresMFA) {
      // Show MFA input
    }
  };
}
```

### MFA Setup Component

```typescript
import { MFASetup } from './components/auth/MFASetup';

function SecuritySettings() {
  return (
    <div>
      <h2>Security Settings</h2>
      <MFASetup />
    </div>
  );
}
```

### Session Manager Component

```typescript
import { SessionManager } from './components/auth/SessionManager';

function AccountSettings() {
  return (
    <div>
      <h2>Active Sessions</h2>
      <SessionManager />
    </div>
  );
}
```

## Security Best Practices

1. **Environment Variables**: Never commit OAuth credentials or JWT secrets
2. **HTTPS**: Always use HTTPS in production for OAuth and secure cookies
3. **CORS**: Configure CORS properly for your production domain
4. **Rate Limiting**: Adjust rate limits based on your usage patterns
5. **Session Timeout**: Configure appropriate session timeouts
6. **Password Policy**: Enforce strong password requirements
7. **Audit Logs**: Regularly review authentication audit logs

## Troubleshooting

### Common Issues

1. **OAuth Redirect Errors**
   - Ensure redirect URIs match exactly in provider settings
   - Check APP_URL and FRONTEND_URL in .env

2. **MFA Not Working**
   - Verify server time is synchronized (TOTP is time-based)
   - Check that MFA secret is properly stored

3. **Session Issues**
   - Ensure Redis is running and accessible
   - Check Redis connection settings in .env

4. **Permission Denied**
   - Verify user has required permissions
   - Check role assignments in database

## Migration Notes

- The migration is idempotent (safe to run multiple times)
- Existing users will have MFA disabled by default
- Default permissions are assigned to roles automatically
- No existing data is modified or deleted

## Future Enhancements

- WebAuthn/FIDO2 support for passwordless authentication
- SMS-based MFA option
- Social login providers (Twitter, LinkedIn)
- Risk-based authentication
- Device fingerprinting
- Geolocation-based security