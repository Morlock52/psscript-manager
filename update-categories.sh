#!/bin/bash

# Script to update the categories in the database with optimized categories for PowerShell scripts

# Set the API URL
API_URL="http://localhost:4001/api"

# Define the categories with descriptions
declare -A CATEGORIES
CATEGORIES=(
  ["System Administration"]="Scripts for managing Windows/Linux systems, including system configuration, maintenance, and monitoring."
  ["Security & Compliance"]="Scripts for security auditing, hardening, compliance checks, vulnerability scanning, and implementing security best practices."
  ["Automation & DevOps"]="Scripts that automate repetitive tasks, create workflows, CI/CD pipelines, and streamline IT processes."
  ["Cloud Management"]="Scripts for managing resources on Azure, AWS, GCP, and other cloud platforms, including provisioning and configuration."
  ["Network Management"]="Scripts for network configuration, monitoring, troubleshooting, and management of network devices and services."
  ["Data Management"]="Scripts for database operations, data processing, ETL (Extract, Transform, Load), and data analysis tasks."
  ["Active Directory"]="Scripts for managing Active Directory, user accounts, groups, permissions, and domain services."
  ["Monitoring & Diagnostics"]="Scripts for system monitoring, logging, diagnostics, performance analysis, and alerting."
  ["Backup & Recovery"]="Scripts for data backup, disaster recovery, system restore, and business continuity operations."
  ["Utilities & Helpers"]="General-purpose utility scripts, helper functions, and reusable modules for various administrative tasks."
)

# Check if PostgreSQL is running
echo "Checking if PostgreSQL is running..."
pg_isready -h localhost -p 5432 -U postgres

if [ $? -ne 0 ]; then
  echo "PostgreSQL is not running. Please start PostgreSQL and try again."
  exit 1
fi

# Clear existing categories
echo "Clearing existing categories..."
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d psscript -c "TRUNCATE categories CASCADE;"

# Reset the sequence
echo "Resetting category ID sequence..."
PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d psscript -c "ALTER SEQUENCE categories_id_seq RESTART WITH 1;"

# Insert new categories
echo "Inserting new categories..."
for CATEGORY in "${!CATEGORIES[@]}"; do
  DESCRIPTION="${CATEGORIES[$CATEGORY]}"
  
  echo "Creating category: $CATEGORY"
  
  # Insert directly into the database
  PGPASSWORD=postgres psql -h localhost -p 5432 -U postgres -d psscript -c "
    INSERT INTO categories (name, description, created_at, updated_at) 
    VALUES ('$CATEGORY', '$DESCRIPTION', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
  "
  
  if [ $? -eq 0 ]; then
    echo "Category '$CATEGORY' created successfully"
  else
    echo "Error creating category '$CATEGORY'"
  fi
  
  echo "-----------------------------------"
done

echo "Category update complete!"
