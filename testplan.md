# PSScript Platform Test Plan

This document outlines the comprehensive test plan for the PSScript platform, focusing on the core features: uploading, storing, AI analyzing, removal functions, and the knowledge section.

## 1. Overview

The PSScript platform is a web application that allows users to upload, store, analyze, and manage PowerShell scripts. The platform also provides a knowledge section for users to learn about PowerShell scripting. This test plan covers the testing of all core features of the platform.

## 2. Test Environment

### 2.1 Production Environment

The production environment is set up using Docker Compose with the following services:

- **Frontend**: React application served by Nginx
- **Backend API**: Node.js API server
- **AI Analysis Service**: Python service for script analysis
- **PostgreSQL**: Database with pgvector extension for vector similarity search
- **Redis**: Caching service
- **Nginx**: Reverse proxy and static file server

### 2.2 Testing Environment

The testing environment is set up using Docker Compose with the same services as the production environment, but with additional configuration for testing:

- Mock mode enabled for faster testing
- Test database with test data
- Test user accounts

## 3. Core Features to Test

### 3.1 File Upload

The file upload feature allows users to upload PowerShell scripts to the platform.

#### Test Cases

1. **Upload a valid PowerShell script**
   - Verify that the script is uploaded successfully
   - Verify that the script appears in the user's script list
   - Verify that the script details are displayed correctly

2. **Upload an invalid file**
   - Verify that the system rejects non-PowerShell files
   - Verify that appropriate error messages are displayed

3. **Upload a duplicate script**
   - Verify that the system detects duplicate scripts based on file hash
   - Verify that appropriate error messages are displayed

### 3.2 Script Storage

The script storage feature allows users to store and manage their PowerShell scripts.

#### Test Cases

1. **View script list**
   - Verify that all uploaded scripts are displayed in the script list
   - Verify that script metadata (title, description, date) is displayed correctly

2. **View script details**
   - Verify that script content is displayed correctly
   - Verify that script metadata is displayed correctly

3. **Update script metadata**
   - Verify that script title and description can be updated
   - Verify that changes are saved and displayed correctly

### 3.3 AI Analysis

The AI analysis feature uses OpenAI to analyze PowerShell scripts for security issues, code quality, and potential risks.

#### Test Cases

1. **Analyze a script**
   - Verify that the analysis is triggered successfully
   - Verify that the analysis results are displayed correctly
   - Verify that the analysis includes security, quality, and risk assessments

2. **View analysis history**
   - Verify that previous analysis results are stored and can be viewed
   - Verify that analysis history is displayed in chronological order

3. **Compare analysis results**
   - Verify that users can compare analysis results from different versions of a script
   - Verify that differences are highlighted correctly

### 3.4 Script Removal

The script removal feature allows users to delete scripts from the platform.

#### Test Cases

1. **Delete a script**
   - Verify that the script is deleted successfully
   - Verify that the script no longer appears in the user's script list
   - Verify that associated data (analysis results, etc.) is also deleted

2. **Cancel deletion**
   - Verify that users can cancel the deletion process
   - Verify that the script remains in the user's script list after cancellation

### 3.5 Knowledge Section

The knowledge section provides information and resources about PowerShell scripting.

#### Test Cases

1. **Browse knowledge articles**
   - Verify that knowledge articles are displayed correctly
   - Verify that articles can be filtered by category

2. **Search knowledge base**
   - Verify that users can search for specific topics
   - Verify that search results are relevant and displayed correctly

3. **Ask questions**
   - Verify that users can ask questions about PowerShell
   - Verify that the AI assistant provides relevant and accurate answers

## 4. Testing Methods

### 4.1 Automated Testing

Automated tests are implemented using the following tools:

- **Puppeteer**: For end-to-end testing of the web interface
- **Jest**: For unit and integration testing of the backend API
- **Pytest**: For testing the AI analysis service

### 4.2 Manual Testing

Manual testing is performed to verify the user experience and to catch issues that automated tests might miss. Manual testing includes:

- User interface testing
- Usability testing
- Cross-browser compatibility testing

## 5. Test Execution

### 5.1 Running Automated Tests

To run the automated tests, use the following scripts:

- **End-to-end tests**: `./run-website-tests.sh`
- **Backend API tests**: `./test-psscript-core.sh`
- **AI service tests**: `./test-ai-service.sh`

### 5.2 Running Tests in Docker

To run the tests in a Docker environment, use the following script:

```bash
./run-docker-tests.sh
```

This script will:

1. Build and start the Docker containers
2. Run the automated tests
3. Generate a test report

### 5.3 Mock Testing

For development and testing purposes, you can use mock testing to simulate the behavior of the AI analysis service without making actual API calls to OpenAI. To run mock tests, use:

```bash
./generate-mock-test-results.sh
```

This script will generate mock test results and a test report.

## 6. Test Reporting

Test results are reported in the following formats:

- **HTML reports**: Generated for end-to-end tests with screenshots
- **JSON reports**: Generated for API and AI service tests
- **Console output**: Displayed during test execution

Test reports are stored in the `test-results` directory.

## 7. Continuous Integration

The test plan is integrated with a CI/CD pipeline to ensure that all tests are run automatically when changes are pushed to the repository. The CI/CD pipeline includes:

- Running automated tests
- Generating test reports
- Deploying to staging if all tests pass
- Deploying to production after manual approval

## 8. Test Data

Test data includes:

- Sample PowerShell scripts of varying complexity
- Test user accounts with different permission levels
- Mock AI analysis results

## 9. Conclusion

This test plan provides a comprehensive approach to testing the PSScript platform, ensuring that all core features work as intended. By following this plan, you can verify the functionality, reliability, and security of the platform before deploying it to production.
