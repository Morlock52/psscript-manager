#!/bin/bash

echo "Testing fixes for script deletion and upload issues..."

# Test script deletion
echo "Testing script deletion..."
curl -X DELETE http://localhost:4001/api/scripts/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -v

echo ""
echo "If you see a success response above, the script deletion fix is working."
echo ""

# Test script upload
echo "Testing script upload..."
curl -X POST http://localhost:4001/api/scripts/upload \
  -H "Content-Type: multipart/form-data" \
  -F "title=Test Script" \
  -F "description=A test script to verify upload fixes" \
  -F "script_file=@test-script.ps1" \
  -v

echo ""
echo "If you see a success response above, the script upload fix is working."
echo ""

echo "Tests completed. Check the responses above to verify the fixes."
