# PSScript Platform Testing Framework

This directory contains a comprehensive testing framework for the PSScript platform, focusing on the core features: uploading, storing, AI analyzing, removal functions, and the knowledge section.

## Quick Start

To verify your test setup:

```bash
./verify-test-setup.sh
```

To run all tests:

```bash
./test-psscript-core.sh
```

To run a specific test:

```bash
./run-specific-test.sh [test_name]
```

To run tests against a deployment:

```bash
./run-deployment-tests.sh [deployment_url]
```

## Files Overview

### Documentation

- **testplan.md** - Comprehensive test plan detailing all test cases
- **README-TESTING.md** - Detailed guide for using the testing framework
- **README-PSSCRIPT-TESTING.md** - This file, providing a quick overview

### Test Scripts

- **test-psscript-core.sh** - Main test script that runs all tests
- **run-specific-test.sh** - Script to run a specific test case
- **run-deployment-tests.sh** - Script to run tests against a deployment
- **verify-test-setup.sh** - Script to verify test setup

### Test Data

- **test-script.ps1** - Sample PowerShell script for testing
- **test-script-modified.ps1** - Modified version for testing versioning
- **test-data.csv** - Sample data file for script execution

## Available Tests

The following tests are available when using `run-specific-test.sh`:

- **upload** - Test script upload functionality
- **duplicate** - Test duplicate detection
- **retrieve** - Test script retrieval
- **update** - Test script update (versioning)
- **analyze** - Test script analysis
- **similar** - Test similar scripts search
- **knowledge** - Test knowledge section (Assistants API)
- **delete** - Test script deletion
- **all** - Run all tests (default)

## Prerequisites

- PSScript platform installed and running
- PostgreSQL with pgvector extension
- Node.js (v16+) and Python (v3.9+)
- OpenAI API key configured in .env file
- jq command-line tool installed (for JSON processing)
- curl command-line tool installed

## Test Results

When running tests with `run-deployment-tests.sh`, results are saved to:

- **test-results/[timestamp]/test-results.log** - Full test log
- **test-results/[timestamp]/summary.md** - Summary report

## Extending the Tests

To add new test cases:

1. Update the `testplan.md` file with new test cases
2. Add new functions to the `test-psscript-core.sh` script
3. Create additional test scripts or data files as needed

## Troubleshooting

If you encounter issues:

1. Run `./verify-test-setup.sh` to check your setup
2. Ensure all services are running
3. Check the API URL in the test scripts
4. Verify credentials in the test scripts

## Deployment Testing

For testing in a deployment environment:

```bash
./run-deployment-tests.sh https://your-deployment-url.com
```

This will:
1. Create a test directory with all necessary files
2. Update the API URL in the test scripts
3. Run all tests against the deployment
4. Generate a summary report

## Security Considerations

- The test scripts use default admin credentials (admin@example.com/adminpassword)
- For production testing, update these credentials in the scripts
- All test data is cleaned up after tests complete

## Contributing

To contribute to the testing framework:

1. Add new test cases to `testplan.md`
2. Implement the test cases in `test-psscript-core.sh`
3. Update documentation as needed
4. Verify your changes with `./verify-test-setup.sh`
