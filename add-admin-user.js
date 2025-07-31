const bcrypt = require('bcrypt');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Database connection parameters
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');
const DB_NAME = process.env.DB_NAME || 'psscript';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_SSL = process.env.DB_SSL === 'true';

// Admin user credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = 'admin@psscript.com';
const ADMIN_PASSWORD = 'ChangeMe1!';

// Initialize Sequelize
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: console.log,
  ssl: DB_SSL ? { rejectUnauthorized: false } : undefined,
});

// Define User model
const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'password_hash'
  },
  role: {
    type: DataTypes.STRING(20),
    defaultValue: 'user'
  }
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

async function createAdminUser() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // Check if user already exists by email
    let existingUser = await User.findOne({ where: { email: ADMIN_EMAIL } });
    
    if (existingUser) {
      console.log(`User with email ${ADMIN_EMAIL} already exists. Updating password and role...`);
      existingUser.password = hashedPassword;
      existingUser.role = 'admin';
      await existingUser.save();
      console.log(`Admin user updated successfully.`);
    } else {
      // Check if username exists
      const existingUsername = await User.findOne({ where: { username: ADMIN_USERNAME } });
      
      // If username exists, create a unique username
      let finalUsername = ADMIN_USERNAME;
      if (existingUsername) {
        finalUsername = `${ADMIN_USERNAME}_${Date.now()}`;
        console.log(`Username ${ADMIN_USERNAME} already exists. Using ${finalUsername} instead.`);
      }
      
      // Create admin user
      const adminUser = await User.create({
        username: finalUsername,
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'admin'
      });
      console.log(`Admin user created successfully with ID: ${adminUser.id}`);
    }

    // Verify the admin user exists
    const adminUser = await User.findOne({ where: { email: ADMIN_EMAIL } });
    if (adminUser) {
      console.log('\nAdmin user details:');
      console.log(`- ID: ${adminUser.id}`);
      console.log(`- Username: ${adminUser.username}`);
      console.log(`- Email: ${ADMIN_EMAIL}`);
      console.log(`- Role: ${adminUser.role}`);
      console.log(`- Password: ${ADMIN_PASSWORD} (please change after first login)`);
    }

  } catch (error) {
    console.error('Error creating/updating admin user:', error);
  } finally {
    await sequelize.close();
  }
}

createAdminUser();
