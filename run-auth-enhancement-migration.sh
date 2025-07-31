#!/bin/bash

# Run Enhanced Authentication Migration Script
# This script sets up all the database tables needed for enhanced authentication features

echo "================================================"
echo "PSScript Enhanced Authentication Migration"
echo "================================================"
echo ""
echo "This migration will add the following features:"
echo "- Multi-Factor Authentication (MFA) tables"
echo "- OAuth provider support (Google, GitHub, Microsoft)"
echo "- Session management tables"
echo "- Granular permissions system"
echo "- Authentication audit logging"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    echo "Please create a .env file with your database configuration."
    exit 1
fi

# Confirm before proceeding
read -p "Do you want to proceed with the migration? (y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "Migration cancelled."
    exit 0
fi

echo ""
echo "Running migration..."
echo ""

# Run the migration
node run-auth-enhancement-migration.js

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "Migration completed successfully!"
    echo "================================================"
    echo ""
    echo "Next steps:"
    echo "1. Update your .env file with OAuth credentials:"
    echo "   - GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET"
    echo "   - GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET"
    echo "   - MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET"
    echo ""
    echo "2. Configure JWT secrets:"
    echo "   - JWT_SECRET (for access tokens)"
    echo "   - JWT_REFRESH_SECRET (for refresh tokens)"
    echo ""
    echo "3. Set optional configuration:"
    echo "   - ACCOUNT_LOCK_DURATION (default: 30 minutes)"
    echo "   - BCRYPT_ROUNDS (default: 12)"
    echo "   - APP_URL (for OAuth callbacks)"
    echo "   - FRONTEND_URL (for OAuth redirects)"
    echo ""
    echo "4. Restart your application to use the new features"
    echo ""
else
    echo ""
    echo "================================================"
    echo "Migration failed!"
    echo "================================================"
    echo "Please check the error messages above and try again."
    exit 1
fi