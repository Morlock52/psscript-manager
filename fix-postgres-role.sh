#!/bin/bash
# fix-postgres-role.sh
# Script to fix the PostgreSQL role issue

set -e
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}PSScript PostgreSQL Role Fix Script${NC}"
echo "==============================================================="

# Check if psql is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}Error: psql is required but not installed. Please install PostgreSQL to continue.${NC}"
    exit 1
fi

# Check if the postgres role exists
echo -e "${YELLOW}Checking if postgres role exists...${NC}"
ROLE_EXISTS=$(psql -U $(whoami) -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='postgres'" 2>/dev/null || echo "0")

if [ "$ROLE_EXISTS" == "1" ]; then
    echo -e "${GREEN}postgres role already exists.${NC}"
else
    echo -e "${YELLOW}postgres role does not exist. Creating...${NC}"
    
    # Create the postgres role
    psql -U $(whoami) -d postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';" 2>/dev/null || {
        echo -e "${RED}Error: Failed to create postgres role. You may need to run this command as a PostgreSQL superuser.${NC}"
        echo -e "${YELLOW}Try running:${NC}"
        echo -e "  sudo -u postgres psql -c \"CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';\""
        exit 1
    }
    
    echo -e "${GREEN}postgres role created successfully.${NC}"
fi

# Check if the psscript database exists
echo -e "${YELLOW}Checking if psscript database exists...${NC}"
DB_EXISTS=$(psql -U $(whoami) -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='psscript'" 2>/dev/null || echo "0")

if [ "$DB_EXISTS" == "1" ]; then
    echo -e "${GREEN}psscript database already exists.${NC}"
else
    echo -e "${YELLOW}psscript database does not exist. Creating...${NC}"
    
    # Create the psscript database
    psql -U $(whoami) -d postgres -c "CREATE DATABASE psscript OWNER postgres;" 2>/dev/null || {
        echo -e "${RED}Error: Failed to create psscript database. You may need to run this command as a PostgreSQL superuser.${NC}"
        echo -e "${YELLOW}Try running:${NC}"
        echo -e "  sudo -u postgres psql -c \"CREATE DATABASE psscript OWNER postgres;\""
        exit 1
    }
    
    echo -e "${GREEN}psscript database created successfully.${NC}"
fi

echo -e "${GREEN}PostgreSQL role and database setup completed.${NC}"
echo -e "${YELLOW}You may now need to run the database migrations:${NC}"
echo -e "  ./run-migration.sh"
echo "==============================================================="

# Update .env file if it exists
if [ -f ".env" ]; then
    echo -e "${YELLOW}Updating .env file with PostgreSQL connection details...${NC}"
    
    # Check if DATABASE_URL is already set
    if grep -q "DATABASE_URL" .env; then
        # Update existing DATABASE_URL
        sed -i.bak 's|DATABASE_URL=.*|DATABASE_URL=postgres://postgres:postgres@localhost:5432/psscript|g' .env
    else
        # Add DATABASE_URL
        echo "DATABASE_URL=postgres://postgres:postgres@localhost:5432/psscript" >> .env
    fi
    
    echo -e "${GREEN}.env file updated successfully.${NC}"
fi

echo -e "${GREEN}All done! You should now be able to start the backend service.${NC}"
echo "==============================================================="
