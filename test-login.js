/**
 * Test Login Functionality
 * 
 * This script tests the login functionality with the admin user.
 */

const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// API URL
const API_URL = process.env.BACKEND_URL || 'http://localhost:4001';

// Admin credentials
const credentials = {
  email: 'admin@psscript.com',
  password: 'ChangeMe1!'
};

// Test login
async function testLogin() {
  try {
    console.log('Testing login with admin credentials...');
    console.log(`API URL: ${API_URL}`);
    console.log(`Email: ${credentials.email}`);
    
    const response = await axios.post(`${API_URL}/api/auth/login`, credentials);
    
    if (response.data) {
      console.log('\nLogin successful!');
      console.log('User details:');
      if (response.data.user) {
        console.log(`- ID: ${response.data.user.id}`);
        console.log(`- Username: ${response.data.user.username}`);
        console.log(`- Email: ${response.data.user.email}`);
        console.log(`- Role: ${response.data.user.role}`);
        console.log(`- Last login: ${response.data.user.last_login_at || 'First login'}`);
      } else {
        console.log('No user data in response');
      }
      
      console.log('\nAuthentication tokens:');
      if (response.data.token) {
        console.log(`- Access token: ${response.data.token.substring(0, 20)}...`);
      }
      if (response.data.refreshToken) {
        console.log(`- Refresh token: ${response.data.refreshToken.substring(0, 20)}...`);
      }
      
      return true;
    } else {
      console.error('Login failed with unexpected response format:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Login failed:', error.message);
    
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    
    return false;
  }
}

// Test user info (with authentication)
async function testGetUserInfo(token) {
  try {
    console.log('\nTesting authenticated user info endpoint...');
    
    const response = await axios.get(`${API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data) {
      console.log('User info retrieved successfully!');
      console.log('User details:');
      if (response.data.user) {
        console.log(`- ID: ${response.data.user.id}`);
        console.log(`- Username: ${response.data.user.username}`);
        console.log(`- Email: ${response.data.user.email}`);
        console.log(`- Role: ${response.data.user.role}`);
      } else {
        console.log('Response data:', JSON.stringify(response.data, null, 2));
      }
      
      return true;
    } else {
      console.error('Get user info failed with unexpected response format:', response.data);
      return false;
    }
  } catch (error) {
    console.error('Get user info failed:', error.message);
    
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    
    return false;
  }
}

// Run the tests
async function runTests() {
  console.log('=== Testing Authentication System ===');
  console.log(`Started at: ${new Date().toISOString()}`);
  
  // Test login
  try {
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, credentials);
    
    if (loginResponse.data) {
      console.log('\nLogin successful!');
      console.log('User details:');
      if (loginResponse.data.user) {
        console.log(`- ID: ${loginResponse.data.user.id}`);
        console.log(`- Username: ${loginResponse.data.user.username}`);
        console.log(`- Email: ${loginResponse.data.user.email}`);
        console.log(`- Role: ${loginResponse.data.user.role}`);
        console.log(`- Last login: ${loginResponse.data.user.last_login_at || 'First login'}`);
      } else {
        console.log('No user data in response');
      }
      
      console.log('\nAuthentication tokens:');
      if (loginResponse.data.token) {
        // Print the full token for use in other tests
        console.log(`FULL_ACCESS_TOKEN: ${loginResponse.data.token}`); 
        console.log(`- Access token (redacted): ${loginResponse.data.token.substring(0, 20)}...`);
        
        // Test the user info endpoint with the token
        console.log('\nTesting authenticated user info endpoint...');
        try {
          const userResponse = await axios.get(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${loginResponse.data.token}`
            }
          });
          
          if (userResponse.data) {
            console.log('User info retrieved successfully!');
            console.log('User info:', JSON.stringify(userResponse.data, null, 2));
          }
        } catch (userError) {
          console.error('Error getting user info:', userError.message);
          if (userError.response) {
            console.error('Error details:', userError.response.data);
          }
        }
      }
      if (loginResponse.data.refreshToken) {
        console.log(`- Refresh token: ${loginResponse.data.refreshToken.substring(0, 20)}...`);
      }
      
      console.log('\nAll tests passed successfully!');
      console.log(`You can now log in to the application at ${process.env.FRONTEND_URL || 'http://localhost:3000'} with:`);
      console.log(`- Email: admin@psscript.com`);
      console.log(`- Password: ChangeMe1!`);
    } else {
      console.error('Login failed with unexpected response format:', loginResponse.data);
    }
  } catch (error) {
    console.error('\nLogin test failed:', error.message);
    
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    
    console.error('\nTests failed. Please check the error messages above.');
  }
}

// Execute the tests
runTests().catch(error => {
  console.error('Unexpected error during tests:', error);
});
