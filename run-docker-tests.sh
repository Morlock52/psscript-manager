#!/bin/bash
# run-docker-tests.sh
# Script to run tests in Docker environment

set -e
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}PSScript Docker Test Runner${NC}"
echo "==============================================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is required but not installed. Please install Docker to continue.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is required but not installed. Please install Docker Compose to continue.${NC}"
    exit 1
fi

# Create test results directory if it doesn't exist
mkdir -p test-results

# Clean up any existing test containers
echo -e "${YELLOW}Cleaning up any existing test containers...${NC}"
docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true

# Build and start the test environment
echo -e "${YELLOW}Building and starting the test environment...${NC}"
docker-compose -f docker-compose.test.yml build

# Start the services
echo -e "${YELLOW}Starting services...${NC}"
docker-compose -f docker-compose.test.yml up -d postgres redis

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
docker-compose -f docker-compose.test.yml run --rm test-runner ./wait-for-it.sh postgres:5432 -- echo "PostgreSQL is ready"

# Start the backend and AI service
echo -e "${YELLOW}Starting backend and AI service...${NC}"
docker-compose -f docker-compose.test.yml up -d backend ai-service

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for backend to be ready...${NC}"
docker-compose -f docker-compose.test.yml run --rm test-runner ./wait-for-it.sh backend:4000 -- echo "Backend is ready"

# Run the tests
echo -e "${YELLOW}Running tests...${NC}"
docker-compose -f docker-compose.test.yml run --rm test-runner ./run-tests-in-docker.sh

# Check the exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
else
    echo -e "${RED}Some tests failed. Check the logs for details.${NC}"
    exit 1
fi

# Clean up
echo -e "${YELLOW}Cleaning up...${NC}"
docker-compose -f docker-compose.test.yml down -v

echo -e "${GREEN}Test run completed.${NC}"
echo "==============================================================="
echo -e "Test results are available in the ${CYAN}test-results${NC} directory."
echo "==============================================================="
