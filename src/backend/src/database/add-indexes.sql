-- Performance optimization indexes for PSScript database
-- Execute these to improve query performance

-- Index for user script queries (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scripts_user_created 
ON scripts(user_id, created_at DESC);

-- Partial index for public scripts only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scripts_public_recent 
ON scripts(created_at DESC) WHERE is_public = true;

-- Index for execution logs by time (for cleanup and monitoring)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_logs_created 
ON execution_logs(created_at DESC);

-- Index for script analysis lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_script_analysis_script_id 
ON script_analysis(script_id);

-- Composite index for user authentication
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
ON users(email) WHERE is_active = true;

-- Index for script search by name/title (for autocomplete)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scripts_name_search 
ON scripts USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Index for execution logs by script for performance monitoring
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_execution_logs_script_status 
ON execution_logs(script_id, status, created_at DESC);

-- Index for file uploads by user
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_file_uploads_user_created 
ON file_uploads(user_id, created_at DESC);

-- Optimize vector similarity searches (if using pgvector)
-- Only create if pgvector extension is enabled
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        -- HNSW index for better vector search performance
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_script_embeddings_hnsw 
        ON script_embeddings USING hnsw (embedding vector_cosine_ops)
        WITH (m = 16, ef_construction = 64);
        
        -- IVFFlat index as alternative/fallback
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_script_embeddings_ivfflat 
        ON script_embeddings USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
    END IF;
END
$$;

-- Index for session management (if using database sessions)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sessions_expires 
ON user_sessions(expires_at) WHERE expires_at > NOW();

-- Analyze tables to update statistics after creating indexes
ANALYZE scripts;
ANALYZE execution_logs;
ANALYZE script_analysis;
ANALYZE users;
ANALYZE file_uploads;

-- Check if vector table exists before analyzing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'script_embeddings') THEN
        ANALYZE script_embeddings;
    END IF;
END
$$;