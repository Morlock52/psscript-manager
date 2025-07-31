-- Performance optimization indexes for PSScript Manager
-- Date: 2025-07-29
-- Purpose: Improve query performance by adding strategic indexes

-- Scripts table indexes
CREATE INDEX IF NOT EXISTS idx_scripts_user_category 
ON scripts(user_id, category_id);

CREATE INDEX IF NOT EXISTS idx_scripts_category_created 
ON scripts(category_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scripts_public_created 
ON scripts(is_public, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scripts_hash_user 
ON scripts(file_hash, user_id);

-- Script analysis table indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_script_analysis_script_id 
ON script_analysis(script_id);

-- Script tags junction table indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_script_tags_script_tag 
ON script_tags(script_id, tag_id);

CREATE INDEX IF NOT EXISTS idx_script_tags_tag 
ON script_tags(tag_id);

-- Users table indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email 
ON users(email);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username 
ON users(username);

-- Chat history indexes (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'chat_histories') THEN
        CREATE INDEX IF NOT EXISTS idx_chat_history_user_created 
        ON chat_histories(user_id, created_at DESC);
    END IF;
END $$;

-- Script embeddings indexes (for vector search)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'script_embeddings') THEN
        CREATE UNIQUE INDEX IF NOT EXISTS idx_script_embeddings_script_id 
        ON script_embeddings(script_id);
    END IF;
END $$;

-- Analyze tables to update statistics after index creation
ANALYZE scripts;
ANALYZE script_analysis;
ANALYZE script_tags;
ANALYZE users;