# PSScript Testing Framework Shell Scripts Guide

This document provides a detailed explanation of all shell scripts in the PSScript testing framework, including their purpose, usage examples, and internal workings.

## Table of Contents

1. [test-psscript-core.sh](#test-psscript-coresh)
2. [run-specific-test.sh](#run-specific-testsh)
3. [run-deployment-tests.sh](#run-deployment-testssh)
4. [verify-test-setup.sh](#verify-test-setupsh)
5. [package-tests.sh](#package-testssh)
6. [prepare-and-package.sh](#prepare-and-packagesh)

---

## test-psscript-core.sh

### Purpose
The main test script that runs all tests for the PSScript platform's core features: uploading, storing, AI analyzing, removal functions, and the knowledge section.

### Usage
```bash
./test-psscript-core.sh
```

### How It Works
This script performs a series of tests in sequence:

1. **Prerequisites Check**: Verifies that all required files and tools are available
2. **Authentication**: Logs in to get an authentication token
3. **Upload Test**: Tests script upload functionality
4. **Duplicate Detection**: Tests the system's ability to detect duplicate scripts
5. **Retrieval Test**: Tests script retrieval functionality
6. **Update Test**: Tests script update (versioning) functionality
7. **Analysis Test**: Tests AI analysis of scripts
8. **Similar Scripts Test**: Tests vector similarity search
9. **Knowledge Section Test**: Tests the Assistants API integration
10. **Deletion Test**: Tests script deletion functionality

### Example Output
```
PSScript Core Features Test Script
Testing uploading, storing, AI analyzing, and removal functions
===============================================================
Checking prerequisites...
Prerequisites check passed
Logging in to get auth token...
Successfully logged in
Testing script upload...
Successfully uploaded script with ID: 123
Testing duplicate script detection...
Duplicate detection working correctly (409 Conflict)
Testing script retrieval...
Successfully retrieved script
Testing script update...
Successfully updated script
Testing script analysis...
Analysis triggered. Waiting for completion (this may take a while)...
Analysis completed successfully
Security Score: 85
Code Quality Score: 90
Risk Score: 15
Testing similar scripts search...
Successfully searched for similar scripts
Similar scripts: 2 found
Testing knowledge section (Assistants API)...
Successfully created assistant with ID: asst_123
Successfully created thread with ID: thread_123
Successfully added message to thread
Successfully created run with ID: run_123
Knowledge section test completed
Testing script deletion...
Script successfully deleted (404 Not Found)
All tests completed successfully!
===============================================================
```

### Key Features
- **Comprehensive Testing**: Tests all core features of the platform
- **Error Handling**: Robust error handling with clear error messages
- **Progress Reporting**: Provides clear progress updates during testing
- **Color-Coded Output**: Uses colors to distinguish between different types of messages

---

## run-specific-test.sh

### Purpose
Allows running a specific test case from the test plan, which is useful for debugging or focusing on a particular feature.

### Usage
```bash
./run-specific-test.sh [test_name] [api_url]
```

Where:
- `test_name` is one of: `upload`, `duplicate`, `retrieve`, `update`, `analyze`, `similar`, `knowledge`, `delete`, or `all`
- `api_url` is the base URL of the API (defaults to `http://localhost:3000`)

### Examples
```bash
# Test script upload functionality on localhost
./run-specific-test.sh upload

# Test script analysis on a specific deployment
./run-specific-test.sh analyze https://psscript-deployment.example.com

# Run all tests on localhost
./run-specific-test.sh all
```

### How It Works
1. **Creates a Temporary Environment**: Sets up a temporary directory with all necessary test files
2. **Runs the Specific Test**: Executes only the requested test function
3. **Cleans Up**: Removes the temporary directory after the test completes

### Key Features
- **Isolated Testing**: Each test runs in its own isolated environment
- **Flexible API Target**: Can test against any deployment by specifying the API URL
- **Efficient Debugging**: Allows focusing on a specific feature without running all tests

---

## run-deployment-tests.sh

### Purpose
Runs all tests against a deployment environment, which is useful for testing after deployment or in different environments.

### Usage
```bash
./run-deployment-tests.sh [deployment_url]
```

Where:
- `deployment_url` is the base URL of the deployment (defaults to `http://localhost:3000`)

### Example
```bash
# Test against a production deployment
./run-deployment-tests.sh https://psscript-production.example.com
```

### How It Works
1. **Creates a Test Results Directory**: Sets up a directory to store test results
2. **Copies Test Files**: Copies all necessary test files to the results directory
3. **Updates API URL**: Modifies the test script to use the specified deployment URL
4. **Runs Tests**: Executes all tests against the deployment
5. **Generates Report**: Creates a summary report of the test results

### Key Features
- **Deployment Testing**: Specifically designed for testing deployments
- **Results Preservation**: Saves test results for later analysis
- **Summary Reporting**: Generates a markdown summary report
- **Dependency Checking**: Verifies that all required tools are available

---

## verify-test-setup.sh

### Purpose
Verifies that all required files and tools for testing are present and correctly configured.

### Usage
```bash
./verify-test-setup.sh
```

### How It Works
1. **Checks Required Files**: Verifies that all necessary test files are present
2. **Checks Executable Permissions**: Ensures that all scripts have executable permissions
3. **Checks Required Tools**: Verifies that external tools like `jq` and `curl` are installed
4. **Provides Summary**: Summarizes the verification results

### Example Output
```
PSScript Platform Test Setup Verification
===============================================================
Checking for required files...
✓ testplan.md
✓ test-psscript-core.sh
✓ test-script.ps1
✓ test-script-modified.ps1
✓ test-data.csv
✓ README-TESTING.md
✓ run-deployment-tests.sh
✓ run-specific-test.sh

Checking executable permissions...
✓ test-psscript-core.sh (executable)
✓ run-deployment-tests.sh (executable)
✓ run-specific-test.sh (executable)

Checking for required tools...
✓ jq
✓ curl

Summary:
All required files are present and have correct permissions.
You can now run the tests using one of the following commands:
  ./test-psscript-core.sh           # Run all tests
  ./run-specific-test.sh [test]     # Run a specific test
  ./run-deployment-tests.sh [url]   # Run tests against a deployment
===============================================================
```

### Key Features
- **Comprehensive Verification**: Checks all aspects of the test setup
- **Clear Reporting**: Provides clear, color-coded output
- **Actionable Feedback**: Suggests fixes for any issues found
- **Command Suggestions**: Provides command examples for next steps

---

## package-tests.sh

### Purpose
Packages all test files into a single archive for distribution to other environments.

### Usage
```bash
./package-tests.sh
```

### How It Works
1. **Creates Package Directory**: Sets up a temporary directory for packaging
2. **Copies Files**: Copies all test files to the package directory
3. **Sets Permissions**: Ensures all scripts have executable permissions
4. **Creates README**: Generates a README file with package information
5. **Creates Archive**: Creates a compressed tar archive of the package
6. **Cleans Up**: Removes the temporary directory

### Example Output
```
PSScript Platform Test Packaging
===============================================================
Creating package directory: psscript-tests-20250323_122510
Copying files to package directory...
✓ Copied testplan.md
✓ Copied test-psscript-core.sh
✓ Copied test-script.ps1
✓ Copied test-script-modified.ps1
✓ Copied test-data.csv
✓ Copied README-TESTING.md
✓ Copied README-PSSCRIPT-TESTING.md
✓ Copied run-deployment-tests.sh
✓ Copied run-specific-test.sh
✓ Copied verify-test-setup.sh
Setting executable permissions...
Creating package README...
Creating package archive: psscript-tests-20250323_122510.tar.gz
Cleaning up temporary directory...
Package created successfully: psscript-tests-20250323_122510.tar.gz (56K)
===============================================================
To extract the package:
  tar -xzf psscript-tests-20250323_122510.tar.gz
  cd psscript-tests-20250323_122510
===============================================================
```

### Key Features
- **Self-Contained Package**: Creates a complete, self-contained package
- **Timestamped Archives**: Uses timestamps to create unique package names
- **Package Documentation**: Includes a README file with package information
- **Extraction Instructions**: Provides instructions for extracting the package

---

## prepare-and-package.sh

### Purpose
Combines verification and packaging into a single step, ensuring that the package is created only if the verification passes.

### Usage
```bash
./prepare-and-package.sh
```

### How It Works
1. **Verifies Test Setup**: Runs `verify-test-setup.sh` to check the test setup
2. **Packages Tests**: If verification passes, runs `package-tests.sh` to create the package
3. **Reports Results**: Provides a summary of the preparation and packaging process

### Example Output
```
PSScript Platform Test Preparation and Packaging
===============================================================
Step 1: Verifying test setup...
PSScript Platform Test Setup Verification
===============================================================
Checking for required files...
✓ testplan.md
✓ test-psscript-core.sh
✓ test-script.ps1
✓ test-script-modified.ps1
✓ test-data.csv
✓ README-TESTING.md
✓ run-deployment-tests.sh
✓ run-specific-test.sh

Checking executable permissions...
✓ test-psscript-core.sh (executable)
✓ run-deployment-tests.sh (executable)
✓ run-specific-test.sh (executable)

Checking for required tools...
✓ jq
✓ curl

Summary:
All required files are present and have correct permissions.
You can now run the tests using one of the following commands:
  ./test-psscript-core.sh           # Run all tests
  ./run-specific-test.sh [test]     # Run a specific test
  ./run-deployment-tests.sh [url]   # Run tests against a deployment
===============================================================

Test setup verification successful!

Step 2: Packaging tests...
PSScript Platform Test Packaging
===============================================================
Creating package directory: psscript-tests-20250323_122510
Copying files to package directory...
✓ Copied testplan.md
✓ Copied test-psscript-core.sh
✓ Copied test-script.ps1
✓ Copied test-script-modified.ps1
✓ Copied test-data.csv
✓ Copied README-TESTING.md
✓ Copied README-PSSCRIPT-TESTING.md
✓ Copied run-deployment-tests.sh
✓ Copied run-specific-test.sh
✓ Copied verify-test-setup.sh
Setting executable permissions...
Creating package README...
Creating package archive: psscript-tests-20250323_122510.tar.gz
Cleaning up temporary directory...
Package created successfully: psscript-tests-20250323_122510.tar.gz (56K)
===============================================================
To extract the package:
  tar -xzf psscript-tests-20250323_122510.tar.gz
  cd psscript-tests-20250323_122510
===============================================================

Test preparation and packaging completed successfully!
===============================================================
You can now distribute the package to test the PSScript platform in different environments.
===============================================================
```

### Key Features
- **Combined Workflow**: Streamlines the verification and packaging process
- **Dependency Checking**: Ensures that packaging only proceeds if verification passes
- **Clear Progress Reporting**: Provides clear progress updates for each step
- **Distribution Guidance**: Provides guidance on distributing the package

---

## Advanced Usage Examples

### Testing a Specific Feature in a Development Environment
```bash
# Test only the script analysis feature
./run-specific-test.sh analyze
```

### Testing a Deployment After Updates
```bash
# Test all features against a staging deployment
./run-deployment-tests.sh https://psscript-staging.example.com
```

### Creating a Package for QA Testing
```bash
# Verify and package all tests for QA
./prepare-and-package.sh
# Send the package to QA
scp psscript-tests-*.tar.gz qa-server:/tmp/
```

### Running Tests with Custom Credentials
```bash
# Edit the test script to use custom credentials
sed -i 's/admin@example.com/qa-user@example.com/g' test-psscript-core.sh
sed -i 's/adminpassword/qa-password/g' test-psscript-core.sh
# Run the tests
./test-psscript-core.sh
```

### Continuous Integration Setup
```bash
# In a CI pipeline script
./verify-test-setup.sh
if [ $? -eq 0 ]; then
  ./test-psscript-core.sh
  if [ $? -eq 0 ]; then
    echo "All tests passed!"
    exit 0
  else
    echo "Tests failed!"
    exit 1
  fi
else
  echo "Test setup verification failed!"
  exit 1
fi
```

## Troubleshooting

### Common Issues and Solutions

#### Missing Dependencies
```
Error: jq is required but not installed. Please install jq to continue.
```
**Solution**: Install jq using your package manager:
```bash
# macOS
brew install jq
# Ubuntu/Debian
sudo apt-get install jq
# CentOS/RHEL
sudo yum install jq
```

#### Permission Denied
```
bash: ./test-psscript-core.sh: Permission denied
```
**Solution**: Make the script executable:
```bash
chmod +x test-psscript-core.sh
```

#### API Connection Issues
```
Error: Failed to login
```
**Solution**: Verify that the API is running and accessible:
```bash
curl http://localhost:3000/api/health
```

#### Authentication Issues
```
Error: Failed to get auth token
```
**Solution**: Verify the credentials in the test script:
```bash
# Check the credentials in the script
grep -A 2 "login" test-psscript-core.sh
# Update if necessary
sed -i 's/adminpassword/your-password/g' test-psscript-core.sh
```

## Script Internals

### Common Functions and Patterns

All scripts in the testing framework follow similar patterns and use common functions:

#### Color Coding
```bash
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
```
These variables define ANSI color codes used for color-coded output.

#### Error Handling
```bash
set -e
```
This setting causes the script to exit immediately if any command fails.

#### Progress Reporting
```bash
echo -e "${YELLOW}Testing script upload...${NC}"
```
These echo statements provide clear progress updates during script execution.

#### API Interaction
```bash
response=$(curl -s -X POST "$API_URL/scripts" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "{\"title\":\"Test Script\",...}")
```
These curl commands interact with the PSScript API.

#### JSON Parsing
```bash
SCRIPT_ID=$(echo $response | jq -r '.id')
```
These jq commands parse JSON responses from the API.

## Conclusion

The shell scripts in the PSScript testing framework provide a comprehensive solution for testing all aspects of the platform. By understanding how these scripts work and how to use them effectively, you can ensure that the platform functions correctly in all environments.

For more information, refer to the following documentation:
- [testplan.md](testplan.md) - Comprehensive test plan
- [README-TESTING.md](README-TESTING.md) - Detailed guide for using the testing framework
- [README-PSSCRIPT-TESTING.md](README-PSSCRIPT-TESTING.md) - Quick overview of the testing framework
- [TESTING-FRAMEWORK-SUMMARY.md](TESTING-FRAMEWORK-SUMMARY.md) - Summary of the testing framework
