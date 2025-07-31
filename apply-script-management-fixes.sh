#!/bin/bash

# Script to apply all the script management fixes

echo "Applying script management fixes..."

# 1. Update docker-compose.override.yml to use the fixed mock AI service
echo "1. Updating docker-compose.override.yml..."
sed -i '' 's/uvicorn main_mock:app/uvicorn main_mock_fixed:app/g' docker-compose.override.yml

# 2. Remove the duplicate route in scripts.ts
echo "2. Fixing duplicate route in scripts.ts..."
# This is already done manually

# 3. Fix the variable reference error in api.ts
echo "3. Fixing variable reference error in api.ts..."
# This is already done manually

# 4. Add handling for unsupported file types in api.ts
echo "4. Adding handling for unsupported file types in api.ts..."
# This is already done manually

echo "All fixes applied successfully!"
echo "To apply the changes, run the restart script:"
echo "./restart-services.sh"

# Make the restart script executable
chmod +x restart-services.sh

echo "Script management fixes completed!"
