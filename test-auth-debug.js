require('dotenv').config({ path: './src/backend/.env' });
const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');

async function testAuth() {
  console.log('Testing authentication setup...\n');
  
  // Test 1: Database connection
  console.log('1. Testing database connection...');
  const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/psscript', {
    logging: false
  });
  
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected\n');
  } catch (error) {
    console.log('❌ Database connection failed:', error.message);
    return;
  }
  
  // Test 2: Check user data
  console.log('2. Checking test user data...');
  try {
    const [results] = await sequelize.query(
      'SELECT id, username, email, password_hash, role FROM users WHERE email = :email',
      {
        replacements: { email: 'test@example.com' },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (!results) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', {
      id: results.id,
      username: results.username,
      email: results.email,
      role: results.role,
      hasPassword: !!results.password_hash
    });
    
    // Test 3: Password validation
    console.log('\n3. Testing password validation...');
    const isValid = await bcrypt.compare('TestPassword123', results.password_hash);
    console.log(isValid ? '✅ Password is valid' : '❌ Password is invalid');
    
    // Test 4: JWT_SECRET
    console.log('\n4. Checking JWT_SECRET...');
    console.log(process.env.JWT_SECRET ? '✅ JWT_SECRET is set' : '❌ JWT_SECRET is missing');
    
    // Test 5: Redis (if configured)
    console.log('\n5. Checking Redis configuration...');
    if (process.env.REDIS_URL || process.env.REDIS_HOST) {
      console.log('⚠️  Redis is configured but may not be accessible');
      console.log('   REDIS_URL:', process.env.REDIS_URL || 'Not set');
      console.log('   REDIS_HOST:', process.env.REDIS_HOST || 'Not set');
    } else {
      console.log('ℹ️  Redis not configured (optional)');
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

testAuth();