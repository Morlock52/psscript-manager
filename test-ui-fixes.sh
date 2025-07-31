#!/bin/bash

echo "Opening browser to test UI fixes for script deletion and upload..."

# Open the script management page to test deletion
echo "Opening script management page to test deletion..."
open "http://localhost:3002/manage"

echo ""
echo "Instructions for testing script deletion:"
echo "1. Find a script in the list"
echo "2. Click the 'Delete' button (trash can icon)"
echo "3. Confirm the deletion in the dialog"
echo "4. Verify that the script is removed without errors"
echo ""

# Open the upload page to test file uploads
echo "Opening upload page to test file uploads..."
open "http://localhost:3002/upload"

echo ""
echo "Instructions for testing script upload:"
echo "1. Click 'Choose File' or drag and drop a PowerShell script"
echo "2. Fill in the title and description"
echo "3. Click 'Upload'"
echo "4. Verify that the upload completes without network errors"
echo ""

echo "UI tests initiated. Follow the instructions above to manually verify the fixes."
