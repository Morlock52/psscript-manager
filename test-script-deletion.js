/**
 * Test script for script deletion functionality
 * 
 * This script tests both individual and bulk script deletion functionality
 * in the PSScript application.
 * NOTE: Authentication is currently bypassed on the backend routes, so this
 * test script does not perform login.
 */

const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables (might still be useful for API_URL)
dotenv.config();

// Configuration
// Default backend URL based on docker-compose.yml
const API_BASE_URL = process.env.API_URL || 'http://localhost:4000';
const TEST_AUTH_TOKEN = process.env.TEST_AUTH_TOKEN; // Read token from environment variable
console.log(`Using API URL: ${API_BASE_URL}`);
const TEST_SCRIPT_COUNT = 3;

// Create axios instance with Authorization header if token is provided
const apiHeaders = {
  'Content-Type': 'application/json'
};
if (TEST_AUTH_TOKEN) {
  console.log('Using provided TEST_AUTH_TOKEN for authentication.');
  apiHeaders['Authorization'] = `Bearer ${TEST_AUTH_TOKEN}`;
} else {
  console.warn('WARN: TEST_AUTH_TOKEN environment variable not set. API calls might fail if authentication is required.');
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: apiHeaders
});

// Helper function to create a test script
async function createTestScript(index) { // Removed api parameter, uses global 'api'
  try {
    const scriptData = {
      title: `Test Script ${index} for Deletion`,
      description: `This is a test script ${index} created for testing the deletion functionality.`,
      content: `# Test Script ${index} for Deletion\n\nWrite-Host "This is test script ${index} for testing deletion functionality."`,
      categoryId: null, // Assuming default category or no category needed
      tags: ['test', 'deletion', `test-${index}`]
    };

    // Prepend /api to the path
    const response = await api.post('/api/scripts', scriptData); 
    console.log(`Created test script ${index} with ID: ${response.data.id}`);
    return response.data;
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`Error creating test script ${index}:`, errorMsg);
    throw error; // Re-throw to stop the test run
  }
}

// Test individual script deletion
async function testIndividualDeletion(scriptId) {
  try {
    console.log(`Testing individual deletion for script ID: ${scriptId}`);
    // Prepend /api to the path
    const response = await api.delete(`/api/scripts/${scriptId}`); 
    
    if (response.status === 200 && response.data.success) { // Check status code too
      console.log(`✅ Successfully deleted script ID: ${scriptId}`);
      return true;
    } else {
      console.error(`❌ Failed to delete script ID: ${scriptId}`);
      console.error('Response Status:', response.status);
      console.error('Response Data:', response.data);
      return false;
    }
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ Error deleting script ID: ${scriptId}:`, errorMsg);
    return false;
  }
}

// Test bulk script deletion
async function testBulkDeletion(scriptIds) {
  try {
    console.log(`Testing bulk deletion for script IDs: ${scriptIds.join(', ')}`);
    // Prepend /api to the path
    const response = await api.post('/api/scripts/delete', { ids: scriptIds }); 
    
    if (response.status === 200 && response.data.success) { // Check status code too
      console.log(`✅ Successfully deleted ${response.data.deletedCount || scriptIds.length} scripts in bulk`);
      return true;
    } else {
      console.error(`❌ Failed to delete scripts in bulk`);
      console.error('Response Status:', response.status);
      console.error('Response Data:', response.data);
      return false;
    }
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`❌ Error deleting scripts in bulk:`, errorMsg);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('Starting script deletion tests...');
  let individualResult = false;
  let bulkResult = false;

  // Check if token is needed but missing
  if (!TEST_AUTH_TOKEN) {
      console.error("ERROR: TEST_AUTH_TOKEN environment variable is not set, but authentication seems required. Set the variable and retry.");
      // Optionally, try to proceed assuming some routes might be public, but likely to fail.
      // For now, exit early if token is expected.
      // process.exit(1); // Uncomment this line to force exit if token is missing
  }
  
  try {
    // Create test scripts for individual deletion
    console.log('\n--- Creating test script for individual deletion ---');
    // Uses the global 'api' instance directly
    const individualScript = await createTestScript('Individual'); 
    
    // Create test scripts for bulk deletion
    console.log('\n--- Creating test scripts for bulk deletion ---');
    const bulkScripts = [];
    for (let i = 1; i <= TEST_SCRIPT_COUNT; i++) {
      // Use a separate try-catch here to potentially continue if one fails, though createTestScript throws
      try {
        const script = await createTestScript(`Bulk-${i}`); 
        bulkScripts.push(script);
      } catch (createError) {
        // Error is logged within createTestScript
        console.error(`Stopping bulk test setup due to failure creating script Bulk-${i}.`);
        // Decide if you want to stop all tests or just skip bulk
        throw createError; // Stop all tests if creation fails
      }
    }
    
    // Test individual deletion
    console.log('\n--- Testing Individual Script Deletion ---');
    if (individualScript && individualScript.id) {
      individualResult = await testIndividualDeletion(individualScript.id); 
    } else {
      console.error("Skipping individual deletion test as script creation failed or returned invalid data.");
      individualResult = false; // Ensure it's marked as failed
    }
    
    // Test bulk deletion
    console.log('\n--- Testing Bulk Script Deletion ---');
    if (bulkScripts.length === TEST_SCRIPT_COUNT) {
      const bulkScriptIds = bulkScripts.map(script => script.id);
      bulkResult = await testBulkDeletion(bulkScriptIds); 
    } else {
       console.error(`Skipping bulk deletion test as only ${bulkScripts.length}/${TEST_SCRIPT_COUNT} scripts were created.`);
       bulkResult = false; // Ensure it's marked as failed
    }
    
  } catch (error) {
    // Error during script creation already logged
    console.error('\n❌ Test execution failed:', error.message);
    // Ensure results are marked as failed if we exited early
    individualResult = individualResult || false; 
    bulkResult = bulkResult || false;
  } finally {
    // Print test summary regardless of errors during setup/execution
    console.log('\n--- Test Summary ---');
    console.log(`Individual Deletion: ${individualResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Bulk Deletion: ${bulkResult ? '✅ PASSED' : '❌ FAILED'}`);
    
    if (individualResult && bulkResult) {
      console.log('\n✅ All script deletion tests passed!');
      process.exit(0); // Exit with success code
    } else {
      console.log('\n❌ Some script deletion tests failed.');
      process.exit(1); // Exit with failure code
    }
  }
}

// Run the tests
runTests();
