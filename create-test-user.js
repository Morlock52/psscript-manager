const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './src/backend/.env' });

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/psscript', {
  logging: false
});

async function createTestUser() {
  try {
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Hash password
    const hashedPassword = await bcrypt.hash('TestPassword123', 10);
    
    // Create user using raw query to avoid model issues
    const [results] = await sequelize.query(`
      INSERT INTO users (username, email, password_hash, role, created_at, updated_at)
      VALUES (
        'testuser',
        'test@example.com',
        :password,
        'user',
        NOW(),
        NOW()
      )
      ON CONFLICT (email) DO UPDATE
      SET password_hash = :password,
          updated_at = NOW()
      RETURNING id, username, email, role
    `, {
      replacements: { password: hashedPassword },
      type: sequelize.QueryTypes.INSERT
    });

    console.log('✅ Test user created successfully!');
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: TestPassword123');
    console.log('👤 Username: testuser');
    console.log('');
    console.log('You can now login at: http://localhost:3002/login');
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    
    // If user exists, update password
    if (error.message.includes('duplicate key') || error.message.includes('already exists')) {
      console.log('User already exists, updating password...');
      
      try {
        const hashedPassword = await bcrypt.hash('TestPassword123', 10);
        await sequelize.query(`
          UPDATE users 
          SET password_hash = :password, updated_at = NOW() 
          WHERE email = 'test@example.com'
        `, {
          replacements: { password: hashedPassword },
          type: sequelize.QueryTypes.UPDATE
        });
        
        console.log('✅ Password updated for existing user!');
        console.log('📧 Email: test@example.com');
        console.log('🔑 Password: TestPassword123');
      } catch (updateError) {
        console.error('❌ Error updating password:', updateError.message);
      }
    }
  } finally {
    await sequelize.close();
  }
}

createTestUser();