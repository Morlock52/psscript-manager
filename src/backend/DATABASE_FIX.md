# Database Connection Fix for PSScript

## Problem
The application is trying to connect to PostgreSQL with:
- User: `psscript`
- Password: `psscript123`
- Database: `psscript`

But the PostgreSQL role 'psscript' does not exist.

## Quick Fix

Run this command from the backend directory:
```bash
cd /Users/morlock/fun/psscript\ 4/src/backend
npm run fix:db
```

This will:
1. Create the PostgreSQL user 'psscript' with password 'psscript123'
2. Create the 'psscript' database
3. Set up all required tables
4. Load initial seed data

## Manual Steps (if the quick fix doesn't work)

### 1. Create PostgreSQL User and Database

Run as PostgreSQL admin (usually 'postgres' user):
```bash
sudo -u postgres psql
```

Then execute:
```sql
-- Create user
CREATE USER psscript WITH PASSWORD 'psscript123';

-- Create database
CREATE DATABASE psscript OWNER psscript;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE psscript TO psscript;
\q
```

### 2. Set up Database Schema

From the backend directory:
```bash
cd /Users/morlock/fun/psscript\ 4/src/backend
npm run setup:db
```

## Available NPM Scripts

- `npm run fix:db` - Complete fix (creates user, database, and tables)
- `npm run setup:postgres` - Just create the PostgreSQL user and database
- `npm run setup:db` - Just create tables and seed data
- `npm run test:db` - Test PostgreSQL connection
- `npm run diagnose:db` - Run comprehensive database diagnostics

## Verify the Fix

After running the fix, test the connection:
```bash
npm run test:db
```

You should see a successful connection message.

## Alternative: Use Different PostgreSQL Credentials

If you already have PostgreSQL set up with different credentials, update the `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password
```

Then run:
```bash
npm run setup:db
```

## Troubleshooting

1. **PostgreSQL not running**: 
   - macOS: `brew services start postgresql@15`
   - Linux: `sudo systemctl start postgresql`

2. **Permission denied**: Run the setup script with sudo or as the postgres user

3. **pgvector extension not found**: This is optional for vector search features. The app will work without it.

4. **Connection refused**: Make sure PostgreSQL is configured to accept local connections in `postgresql.conf` and `pg_hba.conf`