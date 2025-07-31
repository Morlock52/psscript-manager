#!/bin/bash
# Comprehensive test script for PSScript app fixes

echo "========================================================================"
echo "Running complete test suite for PSScript app fixes"
echo "========================================================================"

# Function to check if previous command succeeded
check_status() {
  if [ $? -eq 0 ]; then
    echo "✅ $1 completed successfully"
  else
    echo "❌ $1 failed"
    exit 1
  fi
}

# Test AI script analyzer fixes
echo ""
echo "1. Testing AI script analyzer fixes..."
echo "---------------------------------------"
./test-run-script-analysis.sh
check_status "Script analyzer test"

# Test file upload functionality
echo ""
echo "2. Testing file upload functionality..."
echo "---------------------------------------"
./test-upload-script.sh
check_status "File upload test"

# Test script deletion
echo ""
echo "3. Testing script deletion..."
echo "---------------------------------------"
./test-fixes.sh
check_status "Script deletion test"

# Test authentication
echo ""
echo "4. Testing authentication..."
echo "---------------------------------------"
./test-auth-improvements.sh
check_status "Authentication test"

echo ""
echo "========================================================================"
echo "All tests completed successfully! The PSScript app is working properly."
echo "========================================================================"