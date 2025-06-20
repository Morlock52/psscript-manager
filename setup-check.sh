#!/bin/bash
set -e

# Determine environment (dev or prod)
ENV=${1:-dev}

# Colors for output
GREEN="\033[0;32m"
RED="\033[0;31m"
NC="\033[0m" # No Color

function info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}
function warn() {
  echo -e "${RED}[WARN]${NC} $1"
}

# Check for required commands
function ensure_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    warn "$1 not found. Installing..."
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update && sudo apt-get install -y "$2"
    else
      warn "Automatic installation for $1 not implemented. Please install it manually."
    fi
  else
    info "$1 found."
  fi
}

# Check dependencies
ensure_command docker docker.io

# Docker Compose may be either docker-compose or docker compose
if command -v docker-compose >/dev/null 2>&1; then
  info "docker-compose found."
  DOCKER_COMPOSE="docker-compose"
else
  ensure_command docker-compose docker-compose
  if command -v docker compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
  else
    DOCKER_COMPOSE="docker-compose"
  fi
fi

# Ensure .env exists
if [ ! -f .env ]; then
  info "Creating .env from .env.example"
  cp .env.example .env
fi

# Load env variables
eval $(grep -E '^(DB_PORT|REDIS_PORT|PORT|FRONTEND_PORT)=' .env | xargs -d '\n')

# Default ports if not set
DB_PORT=${DB_PORT:-5432}
REDIS_PORT=${REDIS_PORT:-6379}
BACKEND_PORT=${PORT:-4000}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

PORTS=("$DB_PORT" "$REDIS_PORT" "$BACKEND_PORT" "$FRONTEND_PORT" "5000")
PORT_NAMES=("PostgreSQL" "Redis" "Backend" "Frontend" "AI Service")

function suggest_port() {
  local base=$1
  local p
  for ((p=base+1; p<base+100; p++)); do
    if ! lsof -i:"$p" >/dev/null 2>&1; then
      echo "$p"
      return
    fi
  done
  echo "" # none found
}

info "Checking ports..."
for i in ${!PORTS[@]}; do
  port=${PORTS[$i]}
  name=${PORT_NAMES[$i]}
  if lsof -i:"$port" >/dev/null 2>&1; then
    alt=$(suggest_port $port)
    warn "$name port $port is in use. Suggested alternative: $alt"
  else
    info "$name port $port is available."
  fi
done

info "Making scripts executable"
chmod +x docker-start.sh update-app.sh

info "Starting containers in $ENV mode"
if [ "$ENV" = "prod" ]; then
  $DOCKER_COMPOSE up --build -d
else
  $DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.override.yml up --build -d
fi

info "Checking container status"
$DOCKER_COMPOSE ps

info "Setup complete"
