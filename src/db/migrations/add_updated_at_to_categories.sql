-- Add updated_at column to categories table
ALTER TABLE categories ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing rows to have the same value as created_at
UPDATE categories SET updated_at = created_at;
