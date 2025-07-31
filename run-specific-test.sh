#!/bin/bash
# run-specific-test.sh
# Script to run a specific test case from the PSScript platform test plan

set -e
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Display usage information
function show_usage {
    echo -e "${CYAN}PSScript Platform Specific Test Runner${NC}"
    echo "==============================================================="
    echo "Usage: $0 [test_name] [api_url]"
    echo ""
    echo "Available tests:"
    echo "  upload            - Test script upload functionality"
    echo "  duplicate         - Test duplicate detection"
    echo "  retrieve          - Test script retrieval"
    echo "  update            - Test script update (versioning)"
    echo "  analyze           - Test script analysis"
    echo "  similar           - Test similar scripts search"
    echo "  knowledge         - Test knowledge section (Assistants API)"
    echo "  delete            - Test script deletion"
    echo "  all               - Run all tests (default)"
    echo ""
    echo "Examples:"
    echo "  $0 upload                    - Run upload test on localhost"
    echo "  $0 analyze http://example.com - Run analysis test on example.com"
    echo "  $0 all                       - Run all tests on localhost"
    echo "==============================================================="
    exit 1
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}Error: jq is required but not installed. Please install jq to continue.${NC}"
    exit 1
fi

# Parse arguments
TEST_NAME=${1:-"all"}
API_URL=${2:-"http://localhost:3000"}

# Validate test name
case "$TEST_NAME" in
    "upload"|"duplicate"|"retrieve"|"update"|"analyze"|"similar"|"knowledge"|"delete"|"all")
        # Valid test name
        ;;
    *)
        echo -e "${RED}Error: Invalid test name: $TEST_NAME${NC}"
        show_usage
        ;;
esac

# Create temporary directory for test
TEMP_DIR=$(mktemp -d)
echo -e "${GREEN}Created temporary directory: $TEMP_DIR${NC}"

# Copy test files to temporary directory
cp test-script.ps1 "$TEMP_DIR/"
cp test-script-modified.ps1 "$TEMP_DIR/"
cp test-data.csv "$TEMP_DIR/"

# Create test script in temporary directory
cat > "$TEMP_DIR/run-test.sh" << EOF
#!/bin/bash
# Temporary test script

set -e
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "\${CYAN}PSScript Platform Specific Test: $TEST_NAME\${NC}"
echo "==============================================================="

# Configuration
API_URL="$API_URL/api"
TEST_SCRIPT_PATH="./test-script.ps1"
TEST_SCRIPT_MODIFIED_PATH="./test-script-modified.ps1"
AUTH_TOKEN=""
SCRIPT_ID=""

# Helper functions
function login() {
    echo -e "\${YELLOW}Logging in to get auth token...\${NC}"
    
    response=\$(curl -s -X POST "\$API_URL/auth/login" \\
        -H "Content-Type: application/json" \\
        -d '{"email":"admin@example.com","password":"adminpassword"}')
    
    if [ \$? -ne 0 ]; then
        echo -e "\${RED}Error: Failed to login\${NC}"
        exit 1
    fi
    
    AUTH_TOKEN=\$(echo \$response | jq -r '.token')
    
    if [ "\$AUTH_TOKEN" == "null" ] || [ -z "\$AUTH_TOKEN" ]; then
        echo -e "\${RED}Error: Failed to get auth token. Response: \$response\${NC}"
        exit 1
    fi
    
    echo -e "\${GREEN}Successfully logged in\${NC}"
}

function test_upload() {
    echo -e "\${YELLOW}Testing script upload...\${NC}"
    
    # Read script content
    SCRIPT_CONTENT=\$(cat "\$TEST_SCRIPT_PATH")
    
    # Upload script
    response=\$(curl -s -X POST "\$API_URL/scripts" \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer \$AUTH_TOKEN" \\
        -d "{\\\"title\\\":\\\"Test Script\\\",\\\"description\\\":\\\"A test script for automated testing\\\",\\\"content\\\":\\\"\$SCRIPT_CONTENT\\\",\\\"isPublic\\\":true,\\\"categoryId\\\":1}")
    
    if [ \$? -ne 0 ]; then
        echo -e "\${RED}Error: Failed to upload script\${NC}"
        exit 1
    fi
    
    SCRIPT_ID=\$(echo \$response | jq -r '.id')
    
    if [ "\$SCRIPT_ID" == "null" ] || [ -z "\$SCRIPT_ID" ]; then
        echo -e "\${RED}Error: Failed to get script ID. Response: \$response\${NC}"
        exit 1
    fi
    
    echo -e "\${GREEN}Successfully uploaded script with ID: \$SCRIPT_ID\${NC}"
}

function test_duplicate_detection() {
    echo -e "\${YELLOW}Testing duplicate script detection...\${NC}"
    
    # Read script content
    SCRIPT_CONTENT=\$(cat "\$TEST_SCRIPT_PATH")
    
    # Try to upload the same script again
    status_code=\$(curl -s -o /dev/null -w "%{http_code}" -X POST "\$API_URL/scripts" \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer \$AUTH_TOKEN" \\
        -d "{\\\"title\\\":\\\"Duplicate Test Script\\\",\\\"description\\\":\\\"This should be detected as a duplicate\\\",\\\"content\\\":\\\"\$SCRIPT_CONTENT\\\",\\\"isPublic\\\":true,\\\"categoryId\\\":1}")
    
    if [ "\$status_code" == "409" ]; then
        echo -e "\${GREEN}Duplicate detection working correctly (409 Conflict)\${NC}"
    else
        echo -e "\${RED}Error: Duplicate detection failed. Expected 409, got \$status_code\${NC}"
        exit 1
    fi
}

function test_script_retrieval() {
    echo -e "\${YELLOW}Testing script retrieval...\${NC}"
    
    response=\$(curl -s -X GET "\$API_URL/scripts/\$SCRIPT_ID" \\
        -H "Authorization: Bearer \$AUTH_TOKEN")
    
    if [ \$? -ne 0 ]; then
        echo -e "\${RED}Error: Failed to retrieve script\${NC}"
        exit 1
    fi
    
    title=\$(echo \$response | jq -r '.title')
    
    if [ "\$title" != "Test Script" ]; then
        echo -e "\${RED}Error: Retrieved script has incorrect title. Expected 'Test Script', got '\$title'\${NC}"
        exit 1
    fi
    
    echo -e "\${GREEN}Successfully retrieved script\${NC}"
}

function test_script_update() {
    echo -e "\${YELLOW}Testing script update...\${NC}"
    
    # Read modified script content
    SCRIPT_CONTENT=\$(cat "\$TEST_SCRIPT_MODIFIED_PATH")
    
    # Update script
    response=\$(curl -s -X PUT "\$API_URL/scripts/\$SCRIPT_ID" \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer \$AUTH_TOKEN" \\
        -d "{\\\"title\\\":\\\"Updated Test Script\\\",\\\"description\\\":\\\"An updated test script\\\",\\\"content\\\":\\\"\$SCRIPT_CONTENT\\\",\\\"isPublic\\\":true,\\\"categoryId\\\":1}")
    
    if [ \$? -ne 0 ]; then
        echo -e "\${RED}Error: Failed to update script\${NC}"
        exit 1
    fi
    
    # Verify update
    response=\$(curl -s -X GET "\$API_URL/scripts/\$SCRIPT_ID" \\
        -H "Authorization: Bearer \$AUTH_TOKEN")
    
    title=\$(echo \$response | jq -r '.title')
    
    if [ "\$title" != "Updated Test Script" ]; then
        echo -e "\${RED}Error: Script update failed. Expected title 'Updated Test Script', got '\$title'\${NC}"
        exit 1
    fi
    
    echo -e "\${GREEN}Successfully updated script\${NC}"
}

function test_script_analysis() {
    echo -e "\${YELLOW}Testing script analysis...\${NC}"
    
    # Trigger analysis
    response=\$(curl -s -X POST "\$API_URL/scripts/\$SCRIPT_ID/analyze" \\
        -H "Authorization: Bearer \$AUTH_TOKEN")
    
    if [ \$? -ne 0 ]; then
        echo -e "\${RED}Error: Failed to trigger script analysis\${NC}"
        exit 1
    fi
    
    echo -e "\${YELLOW}Analysis triggered. Waiting for completion (this may take a while)...\${NC}"
    
    # Poll for analysis completion
    max_attempts=30
    attempt=0
    analysis_complete=false
    
    while [ \$attempt -lt \$max_attempts ] && [ "\$analysis_complete" == "false" ]; do
        sleep 5
        attempt=\$((attempt+1))
        
        response=\$(curl -s -X GET "\$API_URL/scripts/\$SCRIPT_ID/analysis" \\
            -H "Authorization: Bearer \$AUTH_TOKEN")
        
        if [ "\$(echo \$response | jq 'has(\"securityScore\")')" == "true" ]; then
            analysis_complete=true
            security_score=\$(echo \$response | jq -r '.securityScore')
            quality_score=\$(echo \$response | jq -r '.codeQualityScore')
            risk_score=\$(echo \$response | jq -r '.riskScore')
            
            echo -e "\${GREEN}Analysis completed successfully\${NC}"
            echo "Security Score: \$security_score"
            echo "Code Quality Score: \$quality_score"
            echo "Risk Score: \$risk_score"
        else
            echo -e "\${YELLOW}Waiting for analysis to complete... (Attempt \$attempt/\$max_attempts)\${NC}"
        fi
    done
    
    if [ "\$analysis_complete" == "false" ]; then
        echo -e "\${RED}Error: Script analysis did not complete within the expected time\${NC}"
        exit 1
    fi
}

function test_similar_scripts() {
    echo -e "\${YELLOW}Testing similar scripts search...\${NC}"
    
    response=\$(curl -s -X GET "\$API_URL/scripts/\$SCRIPT_ID/similar" \\
        -H "Authorization: Bearer \$AUTH_TOKEN")
    
    if [ \$? -ne 0 ]; then
        echo -e "\${RED}Error: Failed to search for similar scripts\${NC}"
        exit 1
    fi
    
    echo -e "\${GREEN}Successfully searched for similar scripts\${NC}"
    echo "Similar scripts: \$(echo \$response | jq -r '.length') found"
}

function test_knowledge_section() {
    echo -e "\${YELLOW}Testing knowledge section (Assistants API)...\${NC}"
    
    # Create assistant
    response=\$(curl -s -X POST "\$API_URL/assistants" \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer \$AUTH_TOKEN" \\
        -d '{"name":"Test Assistant","instructions":"You are a test assistant for PowerShell scripts","model":"gpt-4"}')
    
    if [ \$? -ne 0 ]; then
        echo -e "\${RED}Error: Failed to create assistant\${NC}"
        exit 1
    fi
    
    assistant_id=\$(echo \$response | jq -r '.id')
    
    if [ "\$assistant_id" == "null" ] || [ -z "\$assistant_id" ]; then
        echo -e "\${YELLOW}Assistants API may not be enabled or configured\${NC}"
        return
    fi
    
    echo -e "\${GREEN}Successfully created assistant with ID: \$assistant_id\${NC}"
    
    # Create thread
    response=\$(curl -s -X POST "\$API_URL/threads" \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer \$AUTH_TOKEN" \\
        -d '{}')
    
    thread_id=\$(echo \$response | jq -r '.id')
    
    echo -e "\${GREEN}Successfully created thread with ID: \$thread_id\${NC}"
    
    # Add message to thread
    curl -s -X POST "\$API_URL/threads/\$thread_id/messages" \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer \$AUTH_TOKEN" \\
        -d '{"role":"user","content":"What are best practices for PowerShell error handling?"}'
    
    echo -e "\${GREEN}Successfully added message to thread\${NC}"
    
    # Create run
    response=\$(curl -s -X POST "\$API_URL/threads/\$thread_id/runs" \\
        -H "Content-Type: application/json" \\
        -H "Authorization: Bearer \$AUTH_TOKEN" \\
        -d "{\\\"assistant_id\\\":\\\"\$assistant_id\\\"}")
    
    run_id=\$(echo \$response | jq -r '.id')
    
    echo -e "\${GREEN}Successfully created run with ID: \$run_id\${NC}"
    echo -e "\${YELLOW}Note: Full assistant testing would require polling for run completion\${NC}"
    
    # Clean up
    curl -s -X DELETE "\$API_URL/assistants/\$assistant_id" \\
        -H "Authorization: Bearer \$AUTH_TOKEN"
    
    curl -s -X DELETE "\$API_URL/threads/\$thread_id" \\
        -H "Authorization: Bearer \$AUTH_TOKEN"
    
    echo -e "\${GREEN}Knowledge section test completed\${NC}"
}

function test_script_deletion() {
    echo -e "\${YELLOW}Testing script deletion...\${NC}"
    
    # Delete script
    response=\$(curl -s -X DELETE "\$API_URL/scripts/\$SCRIPT_ID" \\
        -H "Authorization: Bearer \$AUTH_TOKEN")
    
    if [ \$? -ne 0 ]; then
        echo -e "\${RED}Error: Failed to delete script\${NC}"
        exit 1
    fi
    
    # Verify deletion
    status_code=\$(curl -s -o /dev/null -w "%{http_code}" -X GET "\$API_URL/scripts/\$SCRIPT_ID" \\
        -H "Authorization: Bearer \$AUTH_TOKEN")
    
    if [ "\$status_code" == "404" ]; then
        echo -e "\${GREEN}Script successfully deleted (404 Not Found)\${NC}"
    else
        echo -e "\${RED}Error: Script deletion verification failed. Expected 404, got \$status_code\${NC}"
        exit 1
    fi
}

# Main test sequence
login

case "$TEST_NAME" in
    "upload")
        test_upload
        ;;
    "duplicate")
        test_upload
        test_duplicate_detection
        test_script_deletion
        ;;
    "retrieve")
        test_upload
        test_script_retrieval
        test_script_deletion
        ;;
    "update")
        test_upload
        test_script_update
        test_script_deletion
        ;;
    "analyze")
        test_upload
        test_script_analysis
        test_script_deletion
        ;;
    "similar")
        test_upload
        test_similar_scripts
        test_script_deletion
        ;;
    "knowledge")
        test_knowledge_section
        ;;
    "delete")
        test_upload
        test_script_deletion
        ;;
    "all")
        test_upload
        test_duplicate_detection
        test_script_retrieval
        test_script_update
        test_script_analysis
        test_similar_scripts
        test_knowledge_section
        test_script_deletion
        ;;
esac

echo -e "\${GREEN}Test completed successfully!\${NC}"
echo "==============================================================="
EOF

# Make test script executable
chmod +x "$TEMP_DIR/run-test.sh"

# Run the test
cd "$TEMP_DIR"
./run-test.sh

# Clean up
cd - > /dev/null
rm -rf "$TEMP_DIR"
echo -e "${GREEN}Cleaned up temporary directory${NC}"
