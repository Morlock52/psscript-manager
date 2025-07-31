# PSScript Login & Authentication Guide

## How to Access Login

### Method 1: Direct URL
Navigate directly to: **http://localhost:5173/login**

### Method 2: Registration
1. Navigate to: **http://localhost:5173/register**
2. Create a new account with:
   - Username (alphanumeric, 3-50 characters)
   - Email address
   - Password (minimum 8 characters)
   - Confirm password

### Method 3: Add Login Button to Navigation
If you want to add a login button to the main navigation, you can update the Sidebar or Navbar component.

## Test Credentials

For testing purposes, you can create a test account or use these steps:

1. **Register a new account**:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `TestPassword123!`

2. **Database seed (if available)**:
   Check if there are any seeded users in the database by running:
   ```sql
   SELECT username, email FROM users;
   ```

## Authentication Flow

1. **Without Authentication** (Current Default):
   - Chat works with mock responses
   - API keys stored in localStorage
   - No user-specific features

2. **With Authentication**:
   - Access to secure storage
   - Save chat history
   - User-specific scripts
   - Enhanced security

## API Endpoints

### Login
```bash
POST http://localhost:4000/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "TestPassword123!"
}
```

### Register
```bash
POST http://localhost:4000/api/auth/register
Content-Type: application/json

{
  "username": "testuser",
  "email": "test@example.com",
  "password": "TestPassword123!"
}
```

### Verify Token
```bash
GET http://localhost:4000/api/auth/verify
Authorization: Bearer <your-jwt-token>
```

### Get Current User
```bash
GET http://localhost:4000/api/auth/me
Authorization: Bearer <your-jwt-token>
```

## Chrome Extension Errors (Ignore These)

The errors you're seeing:
```
GET chrome-extension://pejdijmoenmkgeppbflobdenhhabjlaj/utils.js net::ERR_FILE_NOT_FOUND
```

These are from the MindStudio Chrome extension and are **NOT** related to your application. You can safely ignore them or disable the extension if they're distracting.

## Adding Login to Navigation

To add a login button to your navigation, update the Sidebar component:

```typescript
// src/frontend/src/components/Sidebar.tsx

// Add to the navigation items
const authItems = user ? [
  {
    name: 'Logout',
    icon: LogoutIcon,
    href: '#',
    onClick: logout
  }
] : [
  {
    name: 'Login',
    icon: LoginIcon,
    href: '/login'
  },
  {
    name: 'Register',
    icon: UserPlusIcon,
    href: '/register'
  }
];
```

## Troubleshooting

### Can't Login?
1. Check if the backend is running: `http://localhost:4000/health`
2. Check database connection
3. Verify JWT_SECRET is set in backend `.env`

### Forgot Password?
Currently not implemented. You'll need to:
1. Create a new account, or
2. Reset password directly in database

### Session Expired?
JWT tokens expire after 24 hours (configurable). Simply login again.

## Security Notes

- Passwords are hashed with bcrypt
- JWT tokens expire after 24 hours
- Refresh tokens not yet implemented
- 2FA not yet implemented

## Quick Test

1. **Start both servers**:
   ```bash
   # Terminal 1 - Backend
   cd src/backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd src/frontend
   npm run dev
   ```

2. **Navigate to login**: http://localhost:5173/login

3. **Create an account**: Click "create a new account"

4. **Test login**: Use your credentials

5. **Verify authentication**: Check for user info in the UI