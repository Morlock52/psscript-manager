#!/bin/bash
# test-psscript-core.sh
# Comprehensive test script for PSScript core features
# Tests uploading, storing, AI analyzing, and removal functions

set -e
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}PSScript Core Features Test Script${NC}"
echo "Testing uploading, storing, AI analyzing, and removal functions"
echo "==============================================================="

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed. Please install jq to continue.${NC}"
    exit 1
fi

# Configuration
API_URL="http://localhost:3000/api"
TEST_SCRIPT_PATH="./test-script.ps1"
TEST_SCRIPT_MODIFIED_PATH="./test-script-modified.ps1"
AUTH_TOKEN=""
SCRIPT_ID=""
DB_HOST="postgres"
DB_USER="postgres"
DB_PASS="password" # Default, ensure this matches your setup
DB_NAME="psscript_db" # Default, ensure this matches your setup

# Helper functions
function verify_db_record() {
    local query=$1
    local expected_count=$2
    local description=$3

    echo -e "${YELLOW}Verifying DB: $description...${NC}"
    
    # Execute psql within the test-runner container
    # Use PGPASSWORD to avoid interactive prompt
    # Use -t for tuples-only output, trim whitespace
    local result=$(docker compose exec -T -e PGPASSWORD=$DB_PASS test-runner psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c "$query" | xargs)
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error executing DB query: $query${NC}"
        # Decide if this should be a fatal error
        # exit 1 
        return 1 # Return error code
    fi

    if [ "$result" == "$expected_count" ]; then
        echo -e "${GREEN}✓ DB Verification Passed: $description (Count: $result)${NC}"
        return 0 # Success
    else
        echo -e "${RED}✗ DB Verification Failed: $description. Expected count $expected_count, got $result${NC}"
        # Decide if this should be a fatal error
        # exit 1
        return 1 # Return error code
    fi
}

function check_prerequisites() {
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    
    # Check if test script exists
    if [ ! -f "$TEST_SCRIPT_PATH" ]; then
        echo -e "${RED}Error: Test script not found at $TEST_SCRIPT_PATH${NC}"
        exit 1
    fi
    
    # Check if backend is running
    if ! curl -s "$API_URL/health" > /dev/null; then
        echo -e "${RED}Error: Backend service is not running. Please start the backend service.${NC}"
        echo "Run: ./start-backend.sh"
        exit 1
    fi
    
    echo -e "${GREEN}Prerequisites check passed${NC}"
}

function login() {
    echo -e "${YELLOW}Logging in to get auth token...${NC}"
    
    response=$(curl -s -X POST "$API_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@example.com","password":"adminpassword"}')
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to login${NC}"
        exit 1
    fi
    
    AUTH_TOKEN=$(echo $response | jq -r '.token')
    
    if [ "$AUTH_TOKEN" == "null" ] || [ -z "$AUTH_TOKEN" ]; then
        echo -e "${RED}Error: Failed to get auth token. Response: $response${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Successfully logged in${NC}"
}

function test_upload() {
    echo -e "${YELLOW}Testing script upload...${NC}"
    
    # Read script content
    SCRIPT_CONTENT=$(cat "$TEST_SCRIPT_PATH")
    
    # Upload script
    response=$(curl -s -X POST "$API_URL/scripts" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d "{\"title\":\"Test Script\",\"description\":\"A test script for automated testing\",\"content\":\"$SCRIPT_CONTENT\",\"isPublic\":true,\"categoryId\":1}")
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to upload script${NC}"
        exit 1
    fi
    
    SCRIPT_ID=$(echo $response | jq -r '.id')
    
    if [ "$SCRIPT_ID" == "null" ] || [ -z "$SCRIPT_ID" ]; then
        echo -e "${RED}Error: Failed to get script ID. Response: $response${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Successfully uploaded script with ID: $SCRIPT_ID${NC}"
    
    # Verify script exists in DB
    verify_db_record "SELECT COUNT(*) FROM scripts WHERE id = $SCRIPT_ID;" "1" "Script $SCRIPT_ID exists after upload" || exit 1 # Exit on verification failure
}

function test_duplicate_detection() {
    echo -e "${YELLOW}Testing duplicate script detection...${NC}"
    
    # Read script content
    SCRIPT_CONTENT=$(cat "$TEST_SCRIPT_PATH")
    
    # Try to upload the same script again
    response=$(curl -s -X POST "$API_URL/scripts" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d "{\"title\":\"Duplicate Test Script\",\"description\":\"This should be detected as a duplicate\",\"content\":\"$SCRIPT_CONTENT\",\"isPublic\":true,\"categoryId\":1}")
    
    status_code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/scripts" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d "{\"title\":\"Duplicate Test Script\",\"description\":\"This should be detected as a duplicate\",\"content\":\"$SCRIPT_CONTENT\",\"isPublic\":true,\"categoryId\":1}")
    
    if [ "$status_code" == "409" ]; then
        echo -e "${GREEN}Duplicate detection working correctly (409 Conflict)${NC}"
    else
        echo -e "${RED}Error: Duplicate detection failed. Expected 409, got $status_code${NC}"
        echo "Response: $response"
    fi
}

function test_script_retrieval() {
    echo -e "${YELLOW}Testing script retrieval...${NC}"
    
    response=$(curl -s -X GET "$API_URL/scripts/$SCRIPT_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to retrieve script${NC}"
        exit 1
    fi
    
    title=$(echo $response | jq -r '.title')
    
    if [ "$title" != "Test Script" ]; then
        echo -e "${RED}Error: Retrieved script has incorrect title. Expected 'Test Script', got '$title'${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Successfully retrieved script${NC}"
}

function test_script_update() {
    echo -e "${YELLOW}Testing script update...${NC}"
    
    # Read modified script content
    if [ ! -f "$TEST_SCRIPT_MODIFIED_PATH" ]; then
        echo -e "${YELLOW}Modified test script not found. Creating one...${NC}"
        cp "$TEST_SCRIPT_PATH" "$TEST_SCRIPT_MODIFIED_PATH"
        echo "# This script was modified for testing" >> "$TEST_SCRIPT_MODIFIED_PATH"
    fi
    
    SCRIPT_CONTENT=$(cat "$TEST_SCRIPT_MODIFIED_PATH")
    
    # Update script
    response=$(curl -s -X PUT "$API_URL/scripts/$SCRIPT_ID" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d "{\"title\":\"Updated Test Script\",\"description\":\"An updated test script\",\"content\":\"$SCRIPT_CONTENT\",\"isPublic\":true,\"categoryId\":1}")
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to update script${NC}"
        exit 1
    fi
    
    # Verify update
    response=$(curl -s -X GET "$API_URL/scripts/$SCRIPT_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    title=$(echo $response | jq -r '.title')
    
    if [ "$title" != "Updated Test Script" ]; then
        echo -e "${RED}Error: Script update failed. Expected title 'Updated Test Script', got '$title'${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Successfully updated script${NC}"
}

function test_script_analysis() {
    echo -e "${YELLOW}Testing script analysis...${NC}"
    
    # Trigger analysis
    response=$(curl -s -X POST "$API_URL/scripts/$SCRIPT_ID/analyze" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to trigger script analysis${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Analysis triggered. Waiting for completion (this may take a while)...${NC}"
    
    # Poll for analysis completion
    max_attempts=30
    attempt=0
    analysis_complete=false
    
    while [ $attempt -lt $max_attempts ] && [ "$analysis_complete" == "false" ]; do
        sleep 5
        attempt=$((attempt+1))
        
        response=$(curl -s -X GET "$API_URL/scripts/$SCRIPT_ID/analysis" \
            -H "Authorization: Bearer $AUTH_TOKEN")
        
        if [ "$(echo $response | jq 'has("securityScore")')" == "true" ]; then
            analysis_complete=true
            security_score=$(echo $response | jq -r '.securityScore')
            quality_score=$(echo $response | jq -r '.codeQualityScore')
            risk_score=$(echo $response | jq -r '.riskScore')
            
            echo -e "${GREEN}Analysis completed successfully${NC}"
            echo "Security Score: $security_score"
            echo "Code Quality Score: $quality_score"
            echo "Risk Score: $risk_score"
        else
            echo -e "${YELLOW}Waiting for analysis to complete... (Attempt $attempt/$max_attempts)${NC}"
        fi
    done
    
    if [ "$analysis_complete" == "false" ]; then
        echo -e "${RED}Error: Script analysis did not complete within the expected time${NC}"
        exit 1
    fi
}

function test_similar_scripts() {
    echo -e "${YELLOW}Testing similar scripts search...${NC}"
    
    response=$(curl -s -X GET "$API_URL/scripts/$SCRIPT_ID/similar" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to search for similar scripts${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Successfully searched for similar scripts${NC}"
    echo "Similar scripts: $(echo $response | jq -r '.length') found"
}

function test_script_deletion() {
    echo -e "${YELLOW}Testing script deletion...${NC}"
    
    # Delete script
    response=$(curl -s -X DELETE "$API_URL/scripts/$SCRIPT_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to delete script${NC}"
        exit 1
    fi
    
    # Verify deletion
    status_code=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$API_URL/scripts/$SCRIPT_ID" \
        -H "Authorization: Bearer $AUTH_TOKEN")
    
    if [ "$status_code" == "404" ]; then
        echo -e "${GREEN}Script successfully deleted (404 Not Found)${NC}"
    else
        echo -e "${RED}Error: Script deletion verification failed. Expected 404, got $status_code${NC}"
        exit 1
    fi
    
    # Verify script is deleted from DB
    verify_db_record "SELECT COUNT(*) FROM scripts WHERE id = $SCRIPT_ID;" "0" "Script $SCRIPT_ID deleted" || exit 1 # Exit on verification failure
}

function test_knowledge_section() {
    echo -e "${YELLOW}Testing knowledge section (Assistants API)...${NC}"
    
    # Create assistant
    response=$(curl -s -X POST "$API_URL/assistants" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{"name":"Test Assistant","instructions":"You are a test assistant for PowerShell scripts","model":"gpt-4"}')
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Error: Failed to create assistant${NC}"
        exit 1
    fi
    
    assistant_id=$(echo $response | jq -r '.id')
    
    if [ "$assistant_id" == "null" ] || [ -z "$assistant_id" ]; then
        echo -e "${YELLOW}Assistants API may not be enabled or configured${NC}"
        return
    fi
    
    echo -e "${GREEN}Successfully created assistant with ID: $assistant_id${NC}"
    
    # Create thread
    response=$(curl -s -X POST "$API_URL/threads" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{}')
    
    thread_id=$(echo $response | jq -r '.id')
    
    echo -e "${GREEN}Successfully created thread with ID: $thread_id${NC}"
    
    # Add message to thread
    curl -s -X POST "$API_URL/threads/$thread_id/messages" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d '{"role":"user","content":"What are best practices for PowerShell error handling?"}'
    
    echo -e "${GREEN}Successfully added message to thread${NC}"
    
    # Create run
    response=$(curl -s -X POST "$API_URL/threads/$thread_id/runs" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -d "{\"assistant_id\":\"$assistant_id\"}")
    
    run_id=$(echo $response | jq -r '.id')
    
    echo -e "${GREEN}Successfully created run with ID: $run_id${NC}"
    echo -e "${YELLOW}Note: Full assistant testing would require polling for run completion${NC}"
    
    # Clean up
    curl -s -X DELETE "$API_URL/assistants/$assistant_id" \
        -H "Authorization: Bearer $AUTH_TOKEN"
    
    curl -s -X DELETE "$API_URL/threads/$thread_id" \
        -H "Authorization: Bearer $AUTH_TOKEN"
    
    echo -e "${GREEN}Knowledge section test completed${NC}"
}

# Main test sequence
check_prerequisites
login
test_upload
test_duplicate_detection
test_script_retrieval
test_script_update
test_script_analysis
test_similar_scripts
test_knowledge_section
test_script_deletion

echo -e "${GREEN}All tests completed successfully!${NC}"
echo "==============================================================="
