const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Database connection configuration
const isDocker = process.env.RUNNING_IN_DOCKER === 'true';
const dbConfig = {
  host: isDocker ? (process.env.POSTGRES_HOST || 'postgres') : 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'psscript',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres'
};

async function runMigration() {
  const client = new Client(dbConfig);
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully');

    // Begin transaction
    await client.query('BEGIN');

    // 1. Add new columns to users table
    console.log('Updating users table...');
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS mfa_secret VARCHAR(255),
      ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP,
      ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP,
      ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS refresh_token VARCHAR(500),
      ADD COLUMN IF NOT EXISTS refresh_token_expires TIMESTAMP;
    `);

    // 2. Create OAuth providers table
    console.log('Creating oauth_providers table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS oauth_providers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(50) NOT NULL,
        provider_user_id VARCHAR(255) NOT NULL,
        provider_email VARCHAR(255),
        provider_data JSONB,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(provider, provider_user_id)
      );
    `);

    // Create index on oauth_providers
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_oauth_providers_user_id 
      ON oauth_providers(user_id);
    `);

    // 3. Create user sessions table
    console.log('Creating user_sessions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) NOT NULL UNIQUE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        last_activity TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes on user_sessions
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id 
      ON user_sessions(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id 
      ON user_sessions(session_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at 
      ON user_sessions(expires_at);
    `);

    // 4. Create MFA backup codes table
    console.log('Creating mfa_backup_codes table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS mfa_backup_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code VARCHAR(255) NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index on mfa_backup_codes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mfa_backup_codes_user_id 
      ON mfa_backup_codes(user_id);
    `);

    // 5. Create user permissions table for granular access control
    console.log('Creating user_permissions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        resource VARCHAR(100),
        action VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create role_permissions junction table
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role VARCHAR(50) NOT NULL,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(role, permission_id)
      );
    `);

    // Create user_permissions junction table for user-specific permissions
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        granted BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, permission_id)
      );
    `);

    // 6. Create audit log table for authentication events
    console.log('Creating auth_audit_log table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS auth_audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        success BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create index on auth_audit_log
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_audit_log_user_id 
      ON auth_audit_log(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_auth_audit_log_created_at 
      ON auth_audit_log(created_at);
    `);

    // 7. Insert default permissions
    console.log('Inserting default permissions...');
    await client.query(`
      INSERT INTO permissions (name, description, resource, action)
      VALUES 
        ('scripts.read', 'View scripts', 'scripts', 'read'),
        ('scripts.write', 'Create and edit scripts', 'scripts', 'write'),
        ('scripts.delete', 'Delete scripts', 'scripts', 'delete'),
        ('scripts.execute', 'Execute scripts', 'scripts', 'execute'),
        ('users.read', 'View user profiles', 'users', 'read'),
        ('users.write', 'Modify user profiles', 'users', 'write'),
        ('users.delete', 'Delete users', 'users', 'delete'),
        ('admin.access', 'Access admin panel', 'admin', 'access'),
        ('settings.manage', 'Manage system settings', 'settings', 'manage')
      ON CONFLICT (name) DO NOTHING;
    `);

    // 8. Assign default permissions to roles
    console.log('Assigning default permissions to roles...');
    await client.query(`
      INSERT INTO role_permissions (role, permission_id)
      SELECT 'admin', id FROM permissions
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO role_permissions (role, permission_id)
      SELECT 'user', id FROM permissions
      WHERE name IN ('scripts.read', 'scripts.write', 'scripts.execute', 'users.read')
      ON CONFLICT DO NOTHING;
    `);

    // Commit transaction
    await client.query('COMMIT');
    console.log('Migration completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
runMigration().catch(console.error);