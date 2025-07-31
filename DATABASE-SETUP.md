# PSScript Database Setup Guide

This guide provides instructions for setting up and configuring the PostgreSQL database for the PSScript platform.

## Prerequisites

- PostgreSQL 12+ installed
- `psql` command-line tool available
- Superuser access to PostgreSQL

## Database Configuration

The PSScript platform requires a PostgreSQL database with the following configuration:

- Database name: `psscript`
- User: `postgres`
- Password: `postgres` (for development; use a secure password in production)
- Host: `localhost` (default)
- Port: `5432` (default)

## Setup Steps

### 1. Check PostgreSQL Installation

Verify that PostgreSQL is installed and running:

```bash
psql --version
```

### 2. Create PostgreSQL Role and Database

You can use the provided script to create the required PostgreSQL role and database:

```bash
./fix-postgres-role.sh
```

This script will:
- Check if the `postgres` role exists and create it if needed
- Check if the `psscript` database exists and create it if needed
- Update the `.env` file with the correct database connection URL

### 3. Manual Setup (if the script fails)

If the script fails, you can manually set up the database:

#### Create the PostgreSQL Role

```bash
sudo -u postgres psql -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';"
```

#### Create the Database

```bash
sudo -u postgres psql -c "CREATE DATABASE psscript OWNER postgres;"
```

#### Update the .env File

Ensure your `.env` file contains the following line:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/psscript
```

### 4. Run Database Migrations

After setting up the database, run the migrations to create the required tables:

```bash
./run-migration.sh
```

## Troubleshooting

### Connection Issues

If you encounter connection issues:

1. **Check PostgreSQL Service**:
   ```bash
   sudo service postgresql status
   ```

2. **Check PostgreSQL Configuration**:
   - Ensure PostgreSQL is configured to accept connections from localhost
   - Check the `pg_hba.conf` file for proper authentication settings

3. **Verify Role Permissions**:
   ```bash
   psql -U postgres -d postgres -c "\du"
   ```

### Role "postgres" Does Not Exist

This error occurs when the PostgreSQL role `postgres` doesn't exist in your PostgreSQL installation. This can happen if:

1. PostgreSQL was installed with a different default superuser name
2. The `postgres` role was deleted

To fix this issue, run:

```bash
sudo -u postgres psql -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';"
```

### Database "psscript" Does Not Exist

This error occurs when the `psscript` database hasn't been created. To fix this issue, run:

```bash
sudo -u postgres psql -c "CREATE DATABASE psscript OWNER postgres;"
```

## pgvector Extension

The PSScript platform uses the pgvector extension for vector similarity search. To install and enable this extension:

### 1. Install pgvector

For Ubuntu/Debian:
```bash
sudo apt-get install postgresql-14-pgvector
```

For macOS with Homebrew:
```bash
brew install pgvector
```

### 2. Enable the Extension

```bash
psql -U postgres -d psscript -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3. Verify Installation

```bash
psql -U postgres -d psscript -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

## Production Considerations

For production environments:

1. **Use a Secure Password**: Change the default password for the `postgres` role
2. **Configure Connection Pooling**: Consider using pgBouncer for connection pooling
3. **Set Up Backups**: Configure regular database backups
4. **Tune PostgreSQL**: Adjust PostgreSQL configuration for better performance

## Additional Resources

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
