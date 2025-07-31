-- Add login_attempts column to users table
ALTER TABLE users
ADD COLUMN login_attempts INTEGER NOT NULL DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN users.login_attempts IS 'Number of failed login attempts since last successful login';
