#!/bin/bash

# Test script to analyze a PowerShell script with command details and MS Docs references

# Set the API URL
API_URL="http://localhost:8000"

# Check if a file was provided
if [ -z "$1" ]; then
  echo "Usage: $0 <path-to-ps1-file>"
  exit 1
fi

# Check if the file exists
if [ ! -f "$1" ]; then
  echo "Error: File $1 does not exist"
  exit 1
fi

# Read the file content
CONTENT=$(cat "$1")

# Create a JSON payload with the script content
JSON_PAYLOAD=$(cat <<EOF
{
  "content": $(printf '%s' "$CONTENT" | jq -Rs .)
}
EOF
)

# Make the API request with command details and MS Docs references
echo "Analyzing script with command details and MS Docs references..."
curl -s -X POST "$API_URL/analyze" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "$JSON_PAYLOAD" \
  --data-urlencode "include_command_details=true" \
  --data-urlencode "fetch_ms_docs=true" | jq .

echo "Analysis complete!"
