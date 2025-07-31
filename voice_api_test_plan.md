# Voice API Test Plan

This document outlines a comprehensive test plan for the Voice API implementation. It provides a structured approach to verify that the Voice API functions correctly after the identified issues have been addressed.

## Test Environment Setup

### Prerequisites

1. **Development Environment**
   - Node.js (v16+)
   - Python 3.10+
   - Docker and Docker Compose
   - Git

2. **API Keys**
   - Google Cloud API key with Text-to-Speech and Speech-to-Text enabled
   - Amazon AWS credentials with Polly and Transcribe access
   - Microsoft Azure Speech Services key

3. **Test Data**
   - Sample text files for speech synthesis
   - Sample audio files for speech recognition
   - Test scripts for automated testing

### Environment Configuration

1. **Local Development**
   ```bash
   # Clone the repository
   git clone https://github.com/your-org/psscript.git
   cd psscript

   # Install dependencies
   npm install
   cd src/ai && pip install -r requirements.txt

   # Set up environment variables
   cp .env.example .env
   # Edit .env file to add API keys and configuration
   ```

2. **Docker Environment**
   ```bash
   # Build and start the containers
   docker-compose up -d

   # Verify the containers are running
   docker-compose ps
   ```

## Test Cases

### 1. Voice Service Core Functionality

#### 1.1 Speech Synthesis

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| TS-001 | Basic text synthesis | 1. Send a request to synthesize a simple text<br>2. Verify the response | Audio data is returned with correct format and metadata |
| TS-002 | Long text synthesis | 1. Send a request with a long text (>1000 chars)<br>2. Verify the response | Audio data is returned with correct format and metadata |
| TS-003 | Special characters | 1. Send a request with text containing special characters<br>2. Verify the response | Audio data is returned with correct pronunciation |
| TS-004 | Different voice IDs | 1. Send requests with different voice IDs<br>2. Verify the responses | Audio data with different voices is returned |
| TS-005 | Different output formats | 1. Send requests with different output formats (mp3, wav, ogg)<br>2. Verify the responses | Audio data in the requested format is returned |

#### 1.2 Speech Recognition

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| TR-001 | Basic speech recognition | 1. Send a request with a simple audio recording<br>2. Verify the response | Recognized text matches the spoken content |
| TR-002 | Different languages | 1. Send requests with audio in different languages<br>2. Verify the responses | Recognized text matches the spoken content in each language |
| TR-003 | Background noise | 1. Send a request with audio containing background noise<br>2. Verify the response | Recognized text is reasonably accurate despite noise |
| TR-004 | Multiple speakers | 1. Send a request with audio containing multiple speakers<br>2. Verify the response | Recognized text captures content from all speakers |
| TR-005 | Different audio formats | 1. Send requests with different audio formats (mp3, wav, ogg)<br>2. Verify the responses | Audio is correctly recognized regardless of format |

### 2. API Security and Validation

#### 2.1 API Key Validation

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| AK-001 | Valid API key | 1. Send a request with a valid API key<br>2. Verify the response | Request is processed successfully |
| AK-002 | Invalid API key | 1. Send a request with an invalid API key<br>2. Verify the response | 401 Unauthorized error is returned |
| AK-003 | Missing API key | 1. Send a request without an API key<br>2. Verify the response | 401 Unauthorized error is returned if API key is required |
| AK-004 | API key format validation | 1. Send a request with an API key in incorrect format<br>2. Verify the response | 401 Unauthorized error with appropriate message |

#### 2.2 Input Validation

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| IV-001 | Empty text for synthesis | 1. Send a synthesis request with empty text<br>2. Verify the response | 400 Bad Request error with appropriate message |
| IV-002 | Invalid voice ID | 1. Send a synthesis request with an invalid voice ID<br>2. Verify the response | 400 Bad Request error with appropriate message |
| IV-003 | Invalid output format | 1. Send a synthesis request with an invalid output format<br>2. Verify the response | 400 Bad Request error with appropriate message |
| IV-004 | Empty audio data for recognition | 1. Send a recognition request with empty audio data<br>2. Verify the response | 400 Bad Request error with appropriate message |
| IV-005 | Invalid audio format | 1. Send a recognition request with invalid audio format<br>2. Verify the response | 400 Bad Request error with appropriate message |
| IV-006 | Audio data too large | 1. Send a recognition request with audio data exceeding size limit<br>2. Verify the response | 400 Bad Request error with appropriate message |

### 3. Caching and Performance

#### 3.1 Caching

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| CA-001 | Cache hit | 1. Send a synthesis request<br>2. Send the same request again<br>3. Verify the responses and response times | Second request is faster and returns the same result |
| CA-002 | Cache invalidation | 1. Send a synthesis request<br>2. Invalidate the cache<br>3. Send the same request again<br>4. Verify the responses | Second request generates a new result |
| CA-003 | Cache size limit | 1. Send multiple synthesis requests with different texts<br>2. Verify the cache size | Cache size does not exceed the configured limit |
| CA-004 | Cache TTL | 1. Send a synthesis request<br>2. Wait for the TTL to expire<br>3. Send the same request again<br>4. Verify the responses | Second request generates a new result |
| CA-005 | Cache statistics | 1. Send multiple synthesis requests<br>2. Get cache statistics<br>3. Verify the statistics | Statistics accurately reflect cache usage |

#### 3.2 Performance

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| PE-001 | Synthesis response time | 1. Measure response time for synthesis requests<br>2. Compare with baseline | Response time is within acceptable limits |
| PE-002 | Recognition response time | 1. Measure response time for recognition requests<br>2. Compare with baseline | Response time is within acceptable limits |
| PE-003 | Concurrent requests | 1. Send multiple concurrent synthesis requests<br>2. Verify the responses and response times | All requests are processed successfully with reasonable response times |
| PE-004 | Memory usage | 1. Monitor memory usage during sustained operation<br>2. Compare with baseline | Memory usage remains stable and within acceptable limits |
| PE-005 | CPU usage | 1. Monitor CPU usage during sustained operation<br>2. Compare with baseline | CPU usage remains stable and within acceptable limits |

### 4. Error Handling and Resilience

#### 4.1 Error Handling

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| EH-001 | Service provider error | 1. Simulate an error from the voice service provider<br>2. Send a request<br>3. Verify the response | Appropriate error message is returned |
| EH-002 | Network error | 1. Simulate a network error<br>2. Send a request<br>3. Verify the response | Appropriate error message is returned |
| EH-003 | Timeout | 1. Simulate a timeout<br>2. Send a request<br>3. Verify the response | 504 Gateway Timeout error is returned |
| EH-004 | Invalid request | 1. Send an invalid request<br>2. Verify the response | 400 Bad Request error with appropriate message |
| EH-005 | Server error | 1. Simulate a server error<br>2. Send a request<br>3. Verify the response | 500 Internal Server Error with appropriate message |

#### 4.2 Resilience

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| RE-001 | Service provider failover | 1. Disable the primary service provider<br>2. Send a request<br>3. Verify the response | Request is processed using the fallback provider |
| RE-002 | Retry mechanism | 1. Simulate a transient error<br>2. Send a request<br>3. Verify the response | Request is retried and eventually succeeds |
| RE-003 | Circuit breaker | 1. Simulate persistent errors from a service provider<br>2. Send multiple requests<br>3. Verify the responses | Circuit breaker opens and requests are routed to fallback provider |
| RE-004 | Rate limiting | 1. Send requests at a rate exceeding the limit<br>2. Verify the responses | Requests are rate-limited with appropriate error messages |
| RE-005 | Graceful degradation | 1. Disable all service providers<br>2. Send a request<br>3. Verify the response | Appropriate error message is returned without crashing the service |

### 5. Integration Tests

#### 5.1 Backend Integration

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| BI-001 | Voice controller to AI service | 1. Send a request to the backend voice controller<br>2. Verify the request is forwarded to the AI service<br>3. Verify the response | Request is correctly forwarded and response is returned |
| BI-002 | Chat controller with voice | 1. Send a chat request with voice_response=true<br>2. Verify the response | Chat response includes synthesized speech |
| BI-003 | Voice settings persistence | 1. Update voice settings<br>2. Verify the settings are stored in the database<br>3. Retrieve the settings<br>4. Verify the retrieved settings match the updated settings | Voice settings are correctly stored and retrieved |
| BI-004 | Authentication with voice endpoints | 1. Send requests to voice endpoints with and without authentication<br>2. Verify the responses | Endpoints respect authentication requirements |
| BI-005 | Error propagation | 1. Simulate an error in the AI service<br>2. Send a request to the backend<br>3. Verify the error is properly propagated to the client | Error is properly propagated with appropriate status code and message |

#### 5.2 Frontend Integration

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| FI-001 | Voice recorder component | 1. Use the voice recorder component to record audio<br>2. Verify the recording functionality | Audio is correctly recorded and available for playback |
| FI-002 | Voice playback component | 1. Use the voice playback component to play synthesized speech<br>2. Verify the playback functionality | Audio is correctly played back |
| FI-003 | Voice chat interface | 1. Use the voice chat interface to send voice messages<br>2. Verify the responses | Voice messages are correctly processed and responses include synthesized speech |
| FI-004 | Voice settings component | 1. Use the voice settings component to update settings<br>2. Verify the settings are applied | Settings are correctly updated and applied |
| FI-005 | Browser compatibility | 1. Test the voice components in different browsers<br>2. Verify the functionality | Components work correctly in supported browsers and degrade gracefully in unsupported browsers |

### 6. End-to-End Tests

#### 6.1 Voice Interaction Flows

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| EE-001 | Voice query and response | 1. Record a voice query<br>2. Send it for processing<br>3. Verify the text response<br>4. Verify the voice response | Query is correctly recognized, processed, and responded to with both text and voice |
| EE-002 | Voice settings customization | 1. Update voice settings<br>2. Send a voice query<br>3. Verify the response respects the settings | Voice response uses the customized settings |
| EE-003 | Multi-turn voice conversation | 1. Start a voice conversation<br>2. Send multiple voice queries<br>3. Verify the responses | Conversation maintains context across multiple turns |
| EE-004 | Voice command execution | 1. Record a voice command<br>2. Send it for processing<br>3. Verify the command is executed | Command is correctly recognized and executed |
| EE-005 | Voice-enabled script analysis | 1. Upload a script<br>2. Request voice analysis<br>3. Verify the analysis results with voice output | Script is correctly analyzed and results are provided with voice output |

#### 6.2 Cross-Platform Tests

| Test ID | Description | Steps | Expected Result |
|---------|-------------|-------|----------------|
| CP-001 | Desktop browsers | 1. Test voice functionality in Chrome, Firefox, Safari, and Edge on desktop<br>2. Verify the functionality | Voice functionality works correctly in all supported desktop browsers |
| CP-002 | Mobile browsers | 1. Test voice functionality in Chrome, Firefox, and Safari on mobile<br>2. Verify the functionality | Voice functionality works correctly in all supported mobile browsers |
| CP-003 | Different operating systems | 1. Test voice functionality on Windows, macOS, and Linux<br>2. Verify the functionality | Voice functionality works correctly on all supported operating systems |
| CP-004 | Different devices | 1. Test voice functionality on desktop, tablet, and smartphone<br>2. Verify the functionality | Voice functionality works correctly on all supported devices |
| CP-005 | Different network conditions | 1. Test voice functionality under different network conditions (fast, slow, intermittent)<br>2. Verify the functionality | Voice functionality works correctly under all network conditions, with appropriate degradation |

## Test Execution

### Test Execution Process

1. **Setup**: Prepare the test environment and test data
2. **Execution**: Execute the test cases according to the test plan
3. **Documentation**: Document the test results, including any issues found
4. **Analysis**: Analyze the test results and identify any issues
5. **Reporting**: Report the test results and issues to the development team

### Automated Testing

1. **Unit Tests**
   ```bash
   # Run unit tests for the voice service
   cd src/ai
   pytest tests/test_voice_service.py

   # Run unit tests for the voice agent
   pytest tests/test_voice_agent.py

   # Run unit tests for the voice endpoints
   pytest tests/test_voice_endpoints.py
   ```

2. **Integration Tests**
   ```bash
   # Run integration tests for the voice API
   cd src/backend
   npm run test:integration -- --grep "Voice API"

   # Run integration tests for the voice components
   cd src/frontend
   npm run test:integration -- --grep "Voice Components"
   ```

3. **End-to-End Tests**
   ```bash
   # Run end-to-end tests for voice functionality
   npm run test:e2e -- --grep "Voice Functionality"
   ```

### Manual Testing

1. **Exploratory Testing**
   - Explore the voice functionality without following a specific test script
   - Focus on user experience and edge cases
   - Document any issues found

2. **Usability Testing**
   - Test the voice functionality with real users
   - Gather feedback on usability and user experience
   - Document any issues found

## Test Reporting

### Test Report Template

```
# Voice API Test Report

## Test Summary
- Total test cases: [Number]
- Passed: [Number]
- Failed: [Number]
- Skipped: [Number]
- Pass rate: [Percentage]

## Test Results
| Test ID | Description | Result | Notes |
|---------|-------------|--------|-------|
| [ID] | [Description] | [Pass/Fail] | [Notes] |
...

## Issues Found
| Issue ID | Description | Severity | Status |
|----------|-------------|----------|--------|
| [ID] | [Description] | [High/Medium/Low] | [Open/Fixed] |
...

## Recommendations
- [Recommendation 1]
- [Recommendation 2]
...
```

### Issue Tracking

1. **Issue Template**
   ```
   # Issue Report

   ## Description
   [Detailed description of the issue]

   ## Steps to Reproduce
   1. [Step 1]
   2. [Step 2]
   ...

   ## Expected Result
   [What should happen]

   ## Actual Result
   [What actually happens]

   ## Environment
   - Browser: [Browser name and version]
   - OS: [Operating system name and version]
   - Device: [Device type]

   ## Screenshots/Logs
   [Screenshots or logs if applicable]

   ## Severity
   [High/Medium/Low]

   ## Assigned To
   [Name of the person assigned to fix the issue]
   ```

2. **Issue Prioritization**
   - **High**: Issues that prevent core functionality from working
   - **Medium**: Issues that affect functionality but have workarounds
   - **Low**: Minor issues that don't significantly affect functionality

## Conclusion

This test plan provides a comprehensive approach to testing the Voice API implementation. By following this plan, the team can ensure that the Voice API functions correctly and meets the requirements. The test cases cover all aspects of the Voice API, from core functionality to security, performance, and integration with other components.

The test plan should be updated as the Voice API evolves and new features are added. The test results should be documented and analyzed to identify any issues and areas for improvement.
