#!/bin/bash

# Setup PostgreSQL user and database for PSScript
# This script should be run with PostgreSQL admin privileges

echo "Setting up PostgreSQL for PSScript..."

# PostgreSQL connection details
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_ADMIN_USER="${POSTGRES_ADMIN_USER:-postgres}"

# PSScript database details
DB_NAME="psscript"
DB_USER="psscript"
DB_PASSWORD="psscript123"

echo "Using PostgreSQL at ${POSTGRES_HOST}:${POSTGRES_PORT}"
echo "Admin user: ${POSTGRES_ADMIN_USER}"

# Function to execute PostgreSQL command
execute_sql() {
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_ADMIN_USER" -c "$1"
}

# Check if we can connect to PostgreSQL
echo "Checking PostgreSQL connection..."
if ! psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_ADMIN_USER" -c '\l' > /dev/null 2>&1; then
    echo "Error: Cannot connect to PostgreSQL as ${POSTGRES_ADMIN_USER}"
    echo "Please ensure PostgreSQL is running and you have the correct admin credentials"
    echo ""
    echo "You might need to run this script with sudo or as the postgres user:"
    echo "  sudo -u postgres $0"
    echo ""
    echo "Or set PGPASSWORD environment variable:"
    echo "  PGPASSWORD=yourpassword $0"
    exit 1
fi

echo "Connected to PostgreSQL successfully"

# Create user if it doesn't exist
echo "Creating user '${DB_USER}'..."
execute_sql "DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '${DB_USER}') THEN
        CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
    ELSE
        ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
    END IF;
END
\$\$;"

# Create database if it doesn't exist
echo "Creating database '${DB_NAME}'..."
execute_sql "SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\\gexec"

# Grant all privileges on database
echo "Granting privileges..."
execute_sql "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};"

# Connect to the database and set up extensions
echo "Setting up database extensions..."
psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_ADMIN_USER" -d "$DB_NAME" <<EOF
-- Grant schema permissions
GRANT ALL ON SCHEMA public TO ${DB_USER};

-- Create pgvector extension if available
CREATE EXTENSION IF NOT EXISTS vector;

-- Grant permissions on any future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${DB_USER};
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO ${DB_USER};
EOF

echo ""
echo "PostgreSQL setup completed successfully!"
echo ""
echo "Database details:"
echo "  Host: ${POSTGRES_HOST}"
echo "  Port: ${POSTGRES_PORT}"
echo "  Database: ${DB_NAME}"
echo "  User: ${DB_USER}"
echo "  Password: ${DB_PASSWORD}"
echo ""
echo "You can now run the application setup:"
echo "  cd /Users/morlock/fun/psscript\\ 4/src/backend"
echo "  npm run setup:db"