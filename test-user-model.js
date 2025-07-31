require('dotenv').config({ path: './src/backend/.env' });

async function testUserModel() {
  try {
    // Import the actual backend database connection
    const db = require('./src/backend/dist/database/connection').default;
    const User = require('./src/backend/dist/models/User').default;
    
    console.log('Testing User model...\n');
    
    // Find user
    const user = await User.findOne({ 
      where: { email: 'test@example.com' } 
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      hasPassword: !!user.password
    });
    
    // Test password validation
    console.log('\nTesting password validation...');
    const isValid = await user.validatePassword('TestPassword123');
    console.log(isValid ? '✅ Password is valid' : '❌ Password is invalid');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Check if compiled files exist
const fs = require('fs');
if (!fs.existsSync('./src/backend/dist')) {
  console.log('Backend not compiled. Please run: cd src/backend && npm run build');
  process.exit(1);
}

testUserModel();