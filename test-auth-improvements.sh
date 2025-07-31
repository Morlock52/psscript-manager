#!/bin/bash

# Test script for authentication improvements
# This script tests the enhanced authentication system

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL for API
API_URL="http://localhost:3000/api"

# Test data
TEST_EMAIL="test-user@example.com"
TEST_PASSWORD="SecurePassword123"
TEST_USERNAME="test-user-$(date +%s)"

echo -e "${BLUE}=== Authentication System Test Script ===${NC}"
echo "Testing enhanced authentication features"
echo "----------------------------------------"

# Function to make API requests
function make_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  if [ -z "$data" ]; then
    curl -s -X "$method" "$API_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN"
  else
    curl -s -X "$method" "$API_URL$endpoint" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "$data"
  fi
}

# Test 1: Registration with invalid data
echo -e "\n${YELLOW}Test 1: Registration with invalid data${NC}"
echo "Sending registration request with invalid email..."

RESPONSE=$(make_request "POST" "/auth/register" '{
  "username": "test-user",
  "email": "invalid-email",
  "password": "short"
}')

ERROR_CODE=$(echo $RESPONSE | jq -r '.error // "none"')
REQUEST_ID=$(echo $RESPONSE | jq -r '.requestId // "none"')

if [ "$ERROR_CODE" == "validation_error" ]; then
  echo -e "${GREEN}✓ Test passed: Received validation error${NC}"
  echo "  Request ID: $REQUEST_ID"
  echo "  Error message: $(echo $RESPONSE | jq -r '.message')"
else
  echo -e "${RED}✗ Test failed: Expected validation error, got: $ERROR_CODE${NC}"
  echo "  Response: $RESPONSE"
fi

# Test 2: Registration with valid data
echo -e "\n${YELLOW}Test 2: Registration with valid data${NC}"
echo "Sending registration request with valid data..."

RESPONSE=$(make_request "POST" "/auth/register" '{
  "username": "'"$TEST_USERNAME"'",
  "email": "'"$TEST_EMAIL"'",
  "password": "'"$TEST_PASSWORD"'"
}')

SUCCESS=$(echo $RESPONSE | jq -r '.success // false')
REQUEST_ID=$(echo $RESPONSE | jq -r '.requestId // "none"')

if [ "$SUCCESS" == "true" ]; then
  echo -e "${GREEN}✓ Test passed: User registered successfully${NC}"
  echo "  Request ID: $REQUEST_ID"
  echo "  User ID: $(echo $RESPONSE | jq -r '.user.id')"
  
  # Save token for subsequent tests
  TOKEN=$(echo $RESPONSE | jq -r '.token')
  REFRESH_TOKEN=$(echo $RESPONSE | jq -r '.refreshToken')
  
  # Export tokens for use in other scripts
  export TEST_AUTH_TOKEN="$TOKEN"
  export TEST_REFRESH_TOKEN="$REFRESH_TOKEN"
  
  echo "  Token received: ${TOKEN:0:15}..."
  echo "  Refresh token received: ${REFRESH_TOKEN:0:15}..."
else
  echo -e "${RED}✗ Test failed: Registration failed${NC}"
  echo "  Response: $RESPONSE"
  exit 1
fi

# Test 3: Duplicate registration
echo -e "\n${YELLOW}Test 3: Duplicate registration${NC}"
echo "Sending registration with same email..."

RESPONSE=$(make_request "POST" "/auth/register" '{
  "username": "another-user",
  "email": "'"$TEST_EMAIL"'",
  "password": "'"$TEST_PASSWORD"'"
}')

ERROR_CODE=$(echo $RESPONSE | jq -r '.error // "none"')
REQUEST_ID=$(echo $RESPONSE | jq -r '.requestId // "none"')

if [ "$ERROR_CODE" == "email_already_exists" ]; then
  echo -e "${GREEN}✓ Test passed: Received email already exists error${NC}"
  echo "  Request ID: $REQUEST_ID"
  echo "  Error message: $(echo $RESPONSE | jq -r '.message')"
else
  echo -e "${RED}✗ Test failed: Expected email_already_exists error, got: $ERROR_CODE${NC}"
  echo "  Response: $RESPONSE"
fi

# Test 4: Login with invalid credentials
echo -e "\n${YELLOW}Test 4: Login with invalid credentials${NC}"
echo "Sending login request with wrong password..."

RESPONSE=$(make_request "POST" "/auth/login" '{
  "email": "'"$TEST_EMAIL"'",
  "password": "wrong-password"
}')

ERROR_CODE=$(echo $RESPONSE | jq -r '.error // "none"')
REQUEST_ID=$(echo $RESPONSE | jq -r '.requestId // "none"')

if [ "$ERROR_CODE" == "invalid_credentials" ]; then
  echo -e "${GREEN}✓ Test passed: Received invalid credentials error${NC}"
  echo "  Request ID: $REQUEST_ID"
  echo "  Error message: $(echo $RESPONSE | jq -r '.message')"
else
  echo -e "${RED}✗ Test failed: Expected invalid_credentials error, got: $ERROR_CODE${NC}"
  echo "  Response: $RESPONSE"
fi

# Test 5: Login with valid credentials
echo -e "\n${YELLOW}Test 5: Login with valid credentials${NC}"
echo "Sending login request with correct credentials..."

RESPONSE=$(make_request "POST" "/auth/login" '{
  "email": "'"$TEST_EMAIL"'",
  "password": "'"$TEST_PASSWORD"'"
}')

SUCCESS=$(echo $RESPONSE | jq -r '.success // false')
REQUEST_ID=$(echo $RESPONSE | jq -r '.requestId // "none"')

if [ "$SUCCESS" == "true" ]; then
  echo -e "${GREEN}✓ Test passed: Login successful${NC}"
  echo "  Request ID: $REQUEST_ID"
  echo "  User ID: $(echo $RESPONSE | jq -r '.user.id')"
  
  # Update token for subsequent tests
  TOKEN=$(echo $RESPONSE | jq -r '.token')
  REFRESH_TOKEN=$(echo $RESPONSE | jq -r '.refreshToken')
  
  # Export tokens for use in other scripts
  export TEST_AUTH_TOKEN="$TOKEN"
  export TEST_REFRESH_TOKEN="$REFRESH_TOKEN"
  
  echo "  Token received: ${TOKEN:0:15}..."
  echo "  Refresh token received: ${REFRESH_TOKEN:0:15}..."
  echo "  Last login timestamp: $(echo $RESPONSE | jq -r '.user.last_login_at')"
else
  echo -e "${RED}✗ Test failed: Login failed${NC}"
  echo "  Response: $RESPONSE"
  exit 1
fi

# Test 6: Get user info
echo -e "\n${YELLOW}Test 6: Get user info${NC}"
echo "Fetching user information..."

RESPONSE=$(make_request "GET" "/auth/me")

SUCCESS=$(echo $RESPONSE | jq -r '.success // false')
REQUEST_ID=$(echo $RESPONSE | jq -r '.requestId // "none"')

if [ "$SUCCESS" == "true" ]; then
  echo -e "${GREEN}✓ Test passed: User info retrieved successfully${NC}"
  echo "  Request ID: $REQUEST_ID"
  echo "  Username: $(echo $RESPONSE | jq -r '.user.username')"
  echo "  Email: $(echo $RESPONSE | jq -r '.user.email')"
  echo "  Role: $(echo $RESPONSE | jq -r '.user.role')"
else
  echo -e "${RED}✗ Test failed: Could not retrieve user info${NC}"
  echo "  Response: $RESPONSE"
fi

# Test 7: Token refresh
echo -e "\n${YELLOW}Test 7: Token refresh${NC}"
echo "Refreshing access token..."

RESPONSE=$(make_request "POST" "/auth/refresh" '{
  "refreshToken": "'"$REFRESH_TOKEN"'"
}')

SUCCESS=$(echo $RESPONSE | jq -r '.success // false')
REQUEST_ID=$(echo $RESPONSE | jq -r '.requestId // "none"')

if [ "$SUCCESS" == "true" ]; then
  echo -e "${GREEN}✓ Test passed: Token refreshed successfully${NC}"
  echo "  Request ID: $REQUEST_ID"
  
  # Update token for subsequent tests
  TOKEN=$(echo $RESPONSE | jq -r '.token')
  
  echo "  New token received: ${TOKEN:0:15}..."
else
  echo -e "${RED}✗ Test failed: Token refresh failed${NC}"
  echo "  Response: $RESPONSE"
fi

# Test 8: Invalid token refresh
echo -e "\n${YELLOW}Test 8: Invalid token refresh${NC}"
echo "Attempting to refresh with invalid token..."

RESPONSE=$(make_request "POST" "/auth/refresh" '{
  "refreshToken": "invalid-token"
}')

ERROR_CODE=$(echo $RESPONSE | jq -r '.error // "none"')
REQUEST_ID=$(echo $RESPONSE | jq -r '.requestId // "none"')

if [[ "$ERROR_CODE" == *"refresh_token"* ]]; then
  echo -e "${GREEN}✓ Test passed: Received token error${NC}"
  echo "  Request ID: $REQUEST_ID"
  echo "  Error code: $ERROR_CODE"
  echo "  Error message: $(echo $RESPONSE | jq -r '.message')"
else
  echo -e "${RED}✗ Test failed: Expected refresh token error, got: $ERROR_CODE${NC}"
  echo "  Response: $RESPONSE"
fi

# Test 9: Missing token
echo -e "\n${YELLOW}Test 9: Missing token${NC}"
echo "Accessing protected endpoint without token..."

# Temporarily clear token
OLD_TOKEN=$TOKEN
TOKEN=""

RESPONSE=$(make_request "GET" "/auth/me")

ERROR_CODE=$(echo $RESPONSE | jq -r '.error // "none"')
REQUEST_ID=$(echo $RESPONSE | jq -r '.requestId // "none"')

# Restore token
TOKEN=$OLD_TOKEN

if [ "$ERROR_CODE" == "missing_token" ]; then
  echo -e "${GREEN}✓ Test passed: Received missing token error${NC}"
  echo "  Request ID: $REQUEST_ID"
  echo "  Error message: $(echo $RESPONSE | jq -r '.message')"
else
  echo -e "${RED}✗ Test failed: Expected missing_token error, got: $ERROR_CODE${NC}"
  echo "  Response: $RESPONSE"
fi

echo -e "\n${BLUE}=== Test Summary ===${NC}"
echo "All authentication tests completed."
echo "Check the results above for any failures."
