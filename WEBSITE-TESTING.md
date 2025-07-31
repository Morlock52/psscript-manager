 # PSScript Website Testing Guide

This guide provides instructions for testing the PSScript platform website using Puppeteer to ensure all features are working as designed.

## Overview

The website testing framework uses Puppeteer, a Node.js library that provides a high-level API to control Chrome or Chromium over the DevTools Protocol. The framework tests all core features of the PSScript platform:

- User authentication (login/logout)
- Script uploading
- Script viewing and management
- Script analysis
- Similar scripts search
- Knowledge section
- Script deletion

## Prerequisites

- Docker installed
- Docker Compose installed
- Git repository cloned
- PSScript platform deployed (or the test will deploy it for you)

## Quick Start

To run the website tests, simply execute the test script:

```bash
./run-website-tests.sh
```

This script will:

1. Check if Docker is running
2. Check if the PSScript website is running (and start it if not)
3. Create a Docker container with Puppeteer
4. Run the tests against the website
5. Generate an HTML report with screenshots of each step

## Test Process

The Puppeteer test performs the following steps:

1. **Navigate to the website**: Opens the PSScript website in a headless browser
2. **Login**: Authenticates with the default admin credentials
3. **Navigate to Upload page**: Goes to the script upload page
4. **Upload a script**: Uploads a test PowerShell script
5. **Verify script was uploaded**: Checks that the script appears in the list
6. **Analyze the script**: Triggers the AI analysis of the script
7. **Test similar scripts search**: Tests the vector similarity search feature
8. **Test knowledge section**: Tests the OpenAI Assistants API integration
9. **Delete the script**: Tests the script deletion functionality
10. **Verify script was deleted**: Checks that the script was successfully deleted
11. **Logout**: Tests the logout functionality

At each step, the test takes a screenshot that is included in the final report.

## Configuration

The test can be configured using environment variables:

- `TEST_URL`: The URL of the PSScript website (default: http://localhost:3002)
- `TEST_USERNAME`: The username to use for login (default: admin@example.com)
- `TEST_PASSWORD`: The password to use for login (default: adminpassword)
- `HEADLESS`: Whether to run the browser in headless mode (default: true)
- `SLOW_MO`: Slow down Puppeteer operations by the specified amount of milliseconds (default: 0)
- `SCREENSHOT_DIR`: Directory to save screenshots (default: test-screenshots)
- `TEST_SCRIPT_PATH`: Path to the test PowerShell script (default: ./test-script.ps1)

You can set these variables in the `.env` file or pass them directly to the `run-website-tests.sh` script:

```bash
TEST_URL=http://example.com HEADLESS=false SLOW_MO=100 ./run-website-tests.sh
```

## Test Results

After the test completes, an HTML report is generated in a timestamped directory (e.g., `website-test-results-20250323_150412`). The report includes:

- A summary of the test results
- Screenshots of each step in the test process
- Timestamps and status information

To view the report, open the `report.html` file in your browser:

```bash
open website-test-results-*/report.html
```

## Troubleshooting

### Tests Failing

If the tests fail, check the screenshots in the test results directory to see where the failure occurred. Common issues include:

- **Website not running**: Make sure the PSScript platform is deployed and running
- **Selector not found**: The test might be looking for elements that don't exist or have changed
- **Timeout**: The website might be responding slowly or not at all
- **Authentication issues**: Check the default credentials in the test configuration

### Docker Issues

If you encounter Docker-related issues:

- **Docker not running**: Start Docker and try again
- **Permission issues**: Make sure you have permission to run Docker commands
- **Network issues**: Check that the Docker container can access the website

## Extending the Tests

### Adding New Tests

To add new tests, modify the `test-website-puppeteer.js` file. The file is structured as a series of steps, each with a descriptive comment. Add your new steps following the same pattern:

```javascript
// Step X: Description of the step
logStep('Step X: Description of the step');
await page.waitForSelector('selector');
await page.click('selector');
await takeScreenshot(page, 'X-step-name');
```

### Testing Different Environments

To test different environments (e.g., staging, production), set the `TEST_URL` environment variable:

```bash
TEST_URL=https://staging.example.com ./run-website-tests.sh
```

## Integration with CI/CD

The website tests can be integrated into a CI/CD pipeline to automatically test the website after deployment. For example, in a GitHub Actions workflow:

```yaml
name: Website Tests

on:
  deployment_status:
    states: [success]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Run website tests
      run: |
        TEST_URL=${{ github.event.deployment_status.target_url }} ./run-website-tests.sh
```

## Conclusion

The Puppeteer website testing framework provides a comprehensive way to test all features of the PSScript platform. By running these tests regularly, you can ensure that the website is functioning correctly and catch any issues before they affect users.
