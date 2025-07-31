#!/bin/bash
# run-deployment-tests.sh
# Script to run PSScript platform tests in a deployment environment

set -e
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}PSScript Platform Deployment Test Runner${NC}"
echo "==============================================================="

# Configuration
DEPLOYMENT_URL=${1:-"http://localhost:3000"}
TEST_DIR="./test-results/$(date +%Y%m%d_%H%M%S)"

# Create test results directory
mkdir -p "$TEST_DIR"
echo -e "${GREEN}Created test results directory: $TEST_DIR${NC}"

# Copy test files to results directory
cp test-script.ps1 "$TEST_DIR/"
cp test-script-modified.ps1 "$TEST_DIR/"
cp test-data.csv "$TEST_DIR/"
cp test-psscript-core.sh "$TEST_DIR/"
cp testplan.md "$TEST_DIR/"
cp README-TESTING.md "$TEST_DIR/"

echo -e "${GREEN}Copied test files to results directory${NC}"

# Update API URL in test script
sed -i.bak "s|API_URL=\"http://localhost:3000/api\"|API_URL=\"$DEPLOYMENT_URL/api\"|g" "$TEST_DIR/test-psscript-core.sh"
echo -e "${GREEN}Updated API URL to $DEPLOYMENT_URL in test script${NC}"

# Make test script executable
chmod +x "$TEST_DIR/test-psscript-core.sh"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}Warning: jq is not installed. Attempting to install...${NC}"
    
    # Try to install jq based on OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt-get &> /dev/null; then
            sudo apt-get update && sudo apt-get install -y jq
        elif command -v yum &> /dev/null; then
            sudo yum install -y jq
        else
            echo -e "${RED}Error: Could not install jq. Please install it manually.${NC}"
            exit 1
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install jq
        else
            echo -e "${RED}Error: Homebrew not found. Please install jq manually.${NC}"
            exit 1
        fi
    else
        echo -e "${RED}Error: Unsupported OS. Please install jq manually.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}jq installed successfully${NC}"
fi

# Check if curl is installed
if ! command -v curl &> /dev/null; then
    echo -e "${RED}Error: curl is required but not installed. Please install curl to continue.${NC}"
    exit 1
fi

# Check if deployment is accessible
if ! curl -s "$DEPLOYMENT_URL/api/health" > /dev/null; then
    echo -e "${RED}Error: Deployment at $DEPLOYMENT_URL is not accessible.${NC}"
    echo "Please check the URL and ensure the PSScript platform is running."
    exit 1
fi

echo -e "${GREEN}Deployment at $DEPLOYMENT_URL is accessible${NC}"

# Run the tests
echo -e "${YELLOW}Running tests...${NC}"
cd "$TEST_DIR"
./test-psscript-core.sh | tee test-results.log

# Check if tests passed
if [ $? -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    echo "Test results saved to: $TEST_DIR/test-results.log"
else
    echo -e "${RED}Some tests failed. Check the log for details.${NC}"
    echo "Test results saved to: $TEST_DIR/test-results.log"
    exit 1
fi

# Create summary report
echo -e "${YELLOW}Creating summary report...${NC}"

cat > "$TEST_DIR/summary.md" << EOF
# PSScript Platform Test Summary

**Date:** $(date)
**Deployment URL:** $DEPLOYMENT_URL
**Test Directory:** $TEST_DIR

## Test Results

$(grep -E "Testing|Successfully|Error|failed" test-results.log | sed 's/\x1b\[[0-9;]*m//g')

## Conclusion

$(if grep -q "All tests completed successfully" test-results.log; then echo "✅ All tests passed"; else echo "❌ Some tests failed"; fi)

## Next Steps

1. Review the full test log for details
2. Address any failed tests
3. Re-run tests after fixes are implemented

EOF

echo -e "${GREEN}Summary report created: $TEST_DIR/summary.md${NC}"
echo "==============================================================="
echo -e "${CYAN}Testing completed!${NC}"
echo "Full test results: $TEST_DIR/test-results.log"
echo "Summary report: $TEST_DIR/summary.md"
echo "==============================================================="
