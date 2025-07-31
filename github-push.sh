#!/bin/bash

# GitHub push script for PSScript
set -e

echo "Preparing to push PSScript to GitHub..."

# Check if git is installed
if ! command -v git &> /dev/null; then
  echo "Error: Git is not installed. Please install Git first."
  exit 1
fi

# Check if .git directory exists
if [ ! -d .git ]; then
  echo "Initializing Git repository..."
  git init
  
  # Ask for GitHub repository URL
  read -p "Enter your GitHub repository URL (e.g., https://github.com/username/psscript.git): " REPO_URL
  
  if [ -z "$REPO_URL" ]; then
    echo "Error: GitHub repository URL is required."
    exit 1
  fi
  
  echo "Adding remote origin..."
  git remote add origin $REPO_URL
else
  echo "Git repository already initialized."
fi

# Stage all files
echo "Staging files..."
git add .

# Commit changes
echo "Committing changes..."
read -p "Enter commit message (default: 'Initial commit with Docker setup'): " COMMIT_MSG
COMMIT_MSG=${COMMIT_MSG:-"Initial commit with Docker setup"}
git commit -m "$COMMIT_MSG"

# Push to GitHub
echo "Pushing to GitHub..."
read -p "Enter branch name (default: main): " BRANCH_NAME
BRANCH_NAME=${BRANCH_NAME:-"main"}

git push -u origin $BRANCH_NAME

echo "Successfully pushed to GitHub!"
echo "Your project is now available on GitHub."

exit 0
