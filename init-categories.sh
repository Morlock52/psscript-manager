#!/bin/bash

# Script to initialize the default categories in the database

# Set the API URL
API_URL="http://localhost:4001/api"

# Define the categories
CATEGORIES=(
  "System Administration"
  "Network Management"
  "Security & Compliance"
  "Automation & Workflows"
  "Cloud Management"
  "Data Management"
  "Development Tools"
  "Monitoring & Diagnostics"
  "User Management"
  "Utilities & Helpers"
)

# Define the descriptions
DESCRIPTIONS=(
  "Scripts for managing Windows/Linux systems, including system configuration, maintenance, and monitoring."
  "Scripts for network configuration, monitoring, troubleshooting, and management of network devices and services."
  "Scripts for security auditing, hardening, compliance checks, and implementing security best practices."
  "Scripts that automate repetitive tasks, create workflows, and streamline processes."
  "Scripts for managing cloud resources on AWS, Azure, GCP, and other cloud platforms."
  "Scripts for database operations, data processing, ETL (Extract, Transform, Load), and data analysis."
  "Scripts for development environments, build processes, CI/CD pipelines, and code management."
  "Scripts for system monitoring, logging, diagnostics, and performance analysis."
  "Scripts for user account management, permissions, group policies, and directory services."
  "General-purpose utility scripts and helper functions for various tasks."
)

# Create each category
for i in "${!CATEGORIES[@]}"; do
  CATEGORY="${CATEGORIES[$i]}"
  DESCRIPTION="${DESCRIPTIONS[$i]}"
  
  echo "Creating category: $CATEGORY"
  
  # Create JSON payload
  JSON_PAYLOAD=$(cat <<EOF
{
  "name": "$CATEGORY",
  "description": "$DESCRIPTION"
}
EOF
)
  
  # Send request to create category
  RESPONSE=$(curl -s -X POST "$API_URL/categories" \
    -H "Content-Type: application/json" \
    -d "$JSON_PAYLOAD")
  
  # Check if category already exists
  if echo "$RESPONSE" | grep -q "already exists"; then
    echo "Category '$CATEGORY' already exists"
  elif echo "$RESPONSE" | grep -q "id"; then
    echo "Category '$CATEGORY' created successfully"
  else
    echo "Error creating category '$CATEGORY': $RESPONSE"
  fi
  
  echo "-----------------------------------"
done

echo "Category initialization complete!"
