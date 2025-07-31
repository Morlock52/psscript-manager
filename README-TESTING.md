# PSScript Platform Testing Guide

This guide provides instructions for testing the PSScript platform's core features: uploading, storing, AI analyzing, removal functions, and the knowledge section.

## Overview

The PSScript platform is designed to handle PowerShell scripts with comprehensive features for analysis, storage, and management. This testing framework ensures all core features work as intended.

## Test Components

1. **testplan.md** - Comprehensive test plan detailing all test cases
2. **test-psscript-core.sh** - Shell script for automated testing of core features
3. **test-script.ps1** - Sample PowerShell script for testing
4. **test-script-modified.ps1** - Modified version for testing versioning
5. **test-data.csv** - Sample data file for script execution

## Prerequisites

Before running the tests, ensure you have the following:

1. PSScript platform installed and running
2. PostgreSQL with pgvector extension
3. Node.js (v16+) and Python (v3.9+)
4. OpenAI API key configured in .env file
5. jq command-line tool installed (for JSON processing)

## Setup Instructions

1. Clone the repository or ensure all test files are in your working directory
2. Make the test script executable:
   ```
   chmod +x test-psscript-core.sh
   ```
3. Start the PSScript platform services:
   ```
   ./start-backend.sh
   ./start-frontend.sh
   ./start-ai-service.sh
   ```

## Running the Tests

### Automated Testing

To run the automated test suite:

```bash
./test-psscript-core.sh
```

This script will:
1. Check prerequisites
2. Log in to get an authentication token
3. Test script upload functionality
4. Test duplicate detection
5. Test script retrieval
6. Test script update (versioning)
7. Test script analysis
8. Test similar scripts search
9. Test knowledge section (Assistants API)
10. Test script deletion

### Manual Testing

For manual testing, follow the steps in the `testplan.md` file. This provides a comprehensive set of test cases for each feature.

## Test Data

The `test-data.csv` file contains sample data that can be used with the test scripts. You can modify this file or create additional test data files as needed.

## Test Scripts

### test-script.ps1

This is a sample PowerShell script that demonstrates various features:
- Parameter handling
- Error handling
- File operations
- CSV processing

### test-script-modified.ps1

This is a modified version of the test script with additional features:
- Enhanced logging
- Multiple file format support
- Additional metadata
- JSON output

## Troubleshooting

If you encounter issues during testing:

1. **API Connection Issues**
   - Verify the backend service is running
   - Check the API URL in the test script

2. **Authentication Issues**
   - Verify the admin user exists
   - Check the credentials in the test script

3. **Analysis Timeout**
   - The AI analysis may take longer than expected
   - Increase the timeout value in the test script

4. **Missing Dependencies**
   - Ensure jq is installed
   - Verify all required services are running

## Extending the Tests

To add new test cases:

1. Update the `testplan.md` file with new test cases
2. Add new functions to the `test-psscript-core.sh` script
3. Create additional test scripts or data files as needed

## Deployment Testing

For testing in a deployment environment:

1. Update the API URL in the test script
2. Ensure all services are properly configured
3. Run the tests against the deployed environment

## Reporting Issues

When reporting issues:

1. Provide the exact error message
2. Include the steps to reproduce
3. Specify the environment details
4. Attach relevant logs

## Conclusion

By following this testing guide, you can ensure that all core features of the PSScript platform are working correctly. Regular testing helps maintain the quality and reliability of the platform.
