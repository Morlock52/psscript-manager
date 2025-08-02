#!/bin/bash

# PSScript API Testing Suite Runner
# Runs comprehensive security and performance tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:4001/api}"
RESULTS_DIR="test-results/api-tests"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}PSScript API Testing Suite${NC}"
echo "=================================="
echo "API URL: $API_URL"
echo "Results directory: $RESULTS_DIR"
echo ""

# Create results directory
mkdir -p "$RESULTS_DIR"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ] || ! npm list axios >/dev/null 2>&1; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install axios
fi

# Check if API is accessible
echo -e "${YELLOW}Checking API availability...${NC}"
if curl -f -s -o /dev/null "$API_URL/health"; then
    echo -e "${GREEN}✓ API is accessible${NC}"
else
    echo -e "${RED}✗ API is not accessible at $API_URL${NC}"
    echo "Please ensure the backend is running and try again."
    exit 1
fi

# Run security and functional tests
echo -e "\n${YELLOW}Running security and functional tests...${NC}"
node api-security-test.js > "$RESULTS_DIR/security-test-$TIMESTAMP.log" 2>&1 &
SECURITY_PID=$!

# Show progress
while kill -0 $SECURITY_PID 2>/dev/null; do
    echo -n "."
    sleep 2
done
echo ""

wait $SECURITY_PID
SECURITY_EXIT_CODE=$?

if [ $SECURITY_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✓ Security tests completed${NC}"
else
    echo -e "${RED}✗ Security tests failed with exit code $SECURITY_EXIT_CODE${NC}"
fi

# Run k6 performance tests if available
if command_exists k6; then
    echo -e "\n${YELLOW}Running k6 performance tests...${NC}"
    
    # Run different scenarios
    SCENARIOS=("smoke" "load" "stress" "spike")
    
    for scenario in "${SCENARIOS[@]}"; do
        echo -e "\n${YELLOW}Running $scenario test...${NC}"
        k6 run \
            --out json="$RESULTS_DIR/k6-$scenario-$TIMESTAMP.json" \
            --summary-export="$RESULTS_DIR/k6-$scenario-summary-$TIMESTAMP.json" \
            -e API_URL="$API_URL" \
            -e SCENARIO="$scenario" \
            k6-performance-test.js > "$RESULTS_DIR/k6-$scenario-$TIMESTAMP.log" 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ $scenario test completed${NC}"
        else
            echo -e "${RED}✗ $scenario test failed${NC}"
        fi
    done
else
    echo -e "${YELLOW}k6 is not installed. Skipping k6 performance tests.${NC}"
    echo "Install k6 with: brew install k6 (macOS) or see https://k6.io/docs/getting-started/installation/"
fi

# Generate consolidated report
echo -e "\n${YELLOW}Generating consolidated report...${NC}"

cat > "$RESULTS_DIR/test-summary-$TIMESTAMP.md" << EOF
# PSScript API Test Summary

**Test Date**: $(date)
**API URL**: $API_URL

## Test Results

### Security Tests
$(if [ $SECURITY_EXIT_CODE -eq 0 ]; then echo "✅ **PASSED**"; else echo "❌ **FAILED**"; fi)

See detailed results in: security-test-$TIMESTAMP.log

### Performance Tests
EOF

if command_exists k6; then
    echo "k6 performance tests were executed. Results available in:" >> "$RESULTS_DIR/test-summary-$TIMESTAMP.md"
    for scenario in "${SCENARIOS[@]}"; do
        echo "- k6-$scenario-$TIMESTAMP.json" >> "$RESULTS_DIR/test-summary-$TIMESTAMP.md"
    done
else
    echo "k6 performance tests were skipped (k6 not installed)." >> "$RESULTS_DIR/test-summary-$TIMESTAMP.md"
fi

# Find the latest test report files
LATEST_JSON_REPORT=$(ls -t api-test-report-*.json 2>/dev/null | head -1)
LATEST_MD_REPORT=$(ls -t api-test-report-*.md 2>/dev/null | head -1)

if [ -n "$LATEST_JSON_REPORT" ]; then
    mv "$LATEST_JSON_REPORT" "$RESULTS_DIR/"
    echo -e "\n${GREEN}✓ JSON report moved to: $RESULTS_DIR/$LATEST_JSON_REPORT${NC}"
fi

if [ -n "$LATEST_MD_REPORT" ]; then
    mv "$LATEST_MD_REPORT" "$RESULTS_DIR/"
    echo -e "${GREEN}✓ Markdown report moved to: $RESULTS_DIR/$LATEST_MD_REPORT${NC}"
    
    # Display summary from the report
    echo -e "\n${YELLOW}Test Summary:${NC}"
    grep -A 5 "## Executive Summary" "$RESULTS_DIR/$LATEST_MD_REPORT" | tail -n +2
fi

echo -e "\n${GREEN}All tests completed!${NC}"
echo "Results saved in: $RESULTS_DIR"
echo ""
echo "To view the detailed report:"
echo "  cat $RESULTS_DIR/$LATEST_MD_REPORT"
echo ""
echo "To analyze security vulnerabilities:"
echo "  grep -A 20 'Critical Vulnerabilities Found' $RESULTS_DIR/security-test-$TIMESTAMP.log"