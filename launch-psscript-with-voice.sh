#!/bin/bash
# Launch PSScript Manager with Voice API Integration
# This script starts all the necessary components of the PSScript Manager platform

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print section header
print_header() {
  echo -e "\n${YELLOW}==== $1 ====${NC}\n"
}

# Function to check if a process is running
check_process() {
  if pgrep -f "$1" > /dev/null; then
    echo -e "${GREEN}✓ $2 is already running${NC}"
    return 0
  else
    return 1
  fi
}

# Function to start a service
start_service() {
  echo -e "${YELLOW}Starting $1...${NC}"
  $2 &
  sleep 2
  if pgrep -f "$3" > /dev/null; then
    echo -e "${GREEN}✓ $1 started successfully${NC}"
  else
    echo -e "${RED}✗ Failed to start $1${NC}"
    exit 1
  fi
}

# Check if required environment variables are set
if [ -z "$VOICE_API_KEY" ]; then
  echo -e "${YELLOW}Warning: VOICE_API_KEY is not set. Using default configuration.${NC}"
fi

# Install dependencies
print_header "Installing Dependencies"
echo -e "${YELLOW}Installing AI service dependencies...${NC}"
cd src/ai && pip install -r requirements.txt
cd ../..
echo -e "${YELLOW}Installing frontend dependencies...${NC}"
cd src/frontend && npm install
cd ../..

# Create necessary directories
mkdir -p voice_cache
echo -e "${GREEN}✓ Created voice cache directory${NC}"

# Start the AI service
print_header "Starting AI Service"
if check_process "uvicorn main:app" "AI Service"; then
  echo -e "${YELLOW}Using existing AI Service instance${NC}"
else
  cd src/ai
  start_service "AI Service" "python -m uvicorn main:app --reload --port 8000" "uvicorn main:app"
  cd ../..
fi

# Start the backend
print_header "Starting Backend"
if check_process "node.*src/backend" "Backend"; then
  echo -e "${YELLOW}Using existing Backend instance${NC}"
else
  cd src/backend
  start_service "Backend" "npm run dev" "node.*src/backend"
  cd ../..
fi

# Start the frontend
print_header "Starting Frontend"
if check_process "node.*src/frontend" "Frontend"; then
  echo -e "${YELLOW}Using existing Frontend instance${NC}"
else
  cd src/frontend
  start_service "Frontend" "npm run dev" "node.*src/frontend"
  cd ../..
fi

# Wait for services to be fully ready
print_header "Waiting for services to be ready"
echo -e "${YELLOW}Waiting for AI Service to be ready...${NC}"
until curl -s http://localhost:8000/docs > /dev/null; do
  echo -n "."
  sleep 1
done
echo -e "\n${GREEN}✓ AI Service is ready${NC}"

echo -e "${YELLOW}Waiting for Backend to be ready...${NC}"
until curl -s http://localhost:4000/api/health > /dev/null; do
  echo -n "."
  sleep 1
done
echo -e "\n${GREEN}✓ Backend is ready${NC}"

echo -e "${YELLOW}Waiting for Frontend to be ready...${NC}"
until curl -s http://localhost:3000 > /dev/null; do
  echo -n "."
  sleep 1
done
echo -e "\n${GREEN}✓ Frontend is ready${NC}"

# Open the application in the default browser
print_header "Opening PSScript Manager"
echo -e "${YELLOW}Opening PSScript Manager in your default browser...${NC}"

# Use the appropriate command based on the OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  # Linux
  xdg-open http://localhost:3000
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
  # Windows
  start http://localhost:3000
else
  echo -e "${YELLOW}Please open http://localhost:3000 in your browser${NC}"
fi

print_header "PSScript Manager is now running"
echo -e "${GREEN}✓ PSScript Manager with Voice API integration is now running${NC}"
echo -e "${YELLOW}AI Service: http://localhost:8000${NC}"
echo -e "${YELLOW}Backend API: http://localhost:4000${NC}"
echo -e "${YELLOW}Frontend: http://localhost:3000${NC}"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for user to press Ctrl+C
trap "echo -e '\n${YELLOW}Stopping all services...${NC}'; pkill -f 'uvicorn main:app'; pkill -f 'node.*src/backend'; pkill -f 'node.*src/frontend'; echo -e '${GREEN}✓ All services stopped${NC}'; exit 0" INT

# Keep the script running
while true; do
  sleep 1
done