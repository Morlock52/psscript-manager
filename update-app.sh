#!/bin/bash

# Update PSScript Manager and restart containers
# Usage: ./update-app.sh [dev|prod]

ENV=${1:-"prod"}

echo "========================================"
echo "Updating PSScript Manager in $ENV mode"
echo "========================================"

# Ensure we are inside the repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Pull latest code
if git rev-parse --git-dir > /dev/null 2>&1; then
  git pull --ff-only
else
  echo "This script must be run from inside the git repository" >&2
  exit 1
fi

# Pull latest container images and rebuild
if [ "$ENV" = "dev" ]; then
  docker-compose -f docker-compose.yml -f docker-compose.override.yml pull
  docker-compose -f docker-compose.yml -f docker-compose.override.yml up --build -d
else
  docker-compose pull
  docker-compose up --build -d
fi

echo "Update complete."
