-- Add performance indexes for frequently queried columns

-- Scripts table indexes
CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_category_id ON scripts(category_id);
CREATE INDEX IF NOT EXISTS idx_scripts_created_at ON scripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scripts_updated_at ON scripts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_scripts_is_public ON scripts(is_public);
CREATE INDEX IF NOT EXISTS idx_scripts_name_search ON scripts USING gin(to_tsvector('english', name));
CREATE INDEX IF NOT EXISTS idx_scripts_description_search ON scripts USING gin(to_tsvector('english', description));
CREATE INDEX IF NOT EXISTS idx_scripts_content_hash ON scripts(content_hash);

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Script_tags table indexes (many-to-many relationship)
CREATE INDEX IF NOT EXISTS idx_script_tags_script_id ON script_tags(script_id);
CREATE INDEX IF NOT EXISTS idx_script_tags_tag_id ON script_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_script_tags_composite ON script_tags(script_id, tag_id);

-- Tags table indexes
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
CREATE INDEX IF NOT EXISTS idx_tags_usage_count ON tags(usage_count DESC);

-- Categories table indexes
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);

-- Script_versions table indexes
CREATE INDEX IF NOT EXISTS idx_script_versions_script_id ON script_versions(script_id);
CREATE INDEX IF NOT EXISTS idx_script_versions_created_at ON script_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_script_versions_created_by ON script_versions(created_by);

-- Script_executions table indexes
CREATE INDEX IF NOT EXISTS idx_script_executions_script_id ON script_executions(script_id);
CREATE INDEX IF NOT EXISTS idx_script_executions_user_id ON script_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_script_executions_started_at ON script_executions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_script_executions_status ON script_executions(status);

-- Script_analysis table indexes
CREATE INDEX IF NOT EXISTS idx_script_analysis_script_id ON script_analysis(script_id);
CREATE INDEX IF NOT EXISTS idx_script_analysis_created_at ON script_analysis(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_script_analysis_risk_score ON script_analysis(risk_score DESC);

-- Script_embeddings table indexes (for vector search)
CREATE INDEX IF NOT EXISTS idx_script_embeddings_script_id ON script_embeddings(script_id);
-- Note: The vector index is created separately using pgvector extension

-- Chat_history table indexes
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);

-- User_sessions table indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);

-- Api_keys table indexes
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_is_active ON api_keys(is_active);

-- Audit_logs table indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_scripts_user_category ON scripts(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_scripts_public_created ON scripts(is_public, created_at DESC) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_script_executions_user_status ON script_executions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active_user ON user_sessions(user_id, is_active) WHERE is_active = true;

-- Partial indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_scripts_active_public ON scripts(created_at DESC) WHERE is_public = true AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_active ON users(email) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_script_executions_running ON script_executions(started_at DESC) WHERE status = 'running';

-- Function to analyze index usage
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE(
  schemaname text,
  tablename text,
  indexname text,
  index_size text,
  index_scans bigint,
  index_tup_read bigint,
  index_tup_fetch bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.schemaname::text,
    s.tablename::text,
    s.indexname::text,
    pg_size_pretty(pg_relation_size(s.indexrelid))::text as index_size,
    s.idx_scan as index_scans,
    s.idx_tup_read as index_tup_read,
    s.idx_tup_fetch as index_tup_fetch
  FROM pg_stat_user_indexes s
  JOIN pg_index i ON s.indexrelid = i.indexrelid
  WHERE s.schemaname = 'public'
  ORDER BY s.idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to identify missing indexes
CREATE OR REPLACE FUNCTION suggest_missing_indexes()
RETURNS TABLE(
  tablename text,
  attname text,
  n_distinct real,
  correlation real,
  suggested_index text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.relname::text as tablename,
    a.attname::text,
    s.n_distinct,
    s.correlation,
    format('CREATE INDEX idx_%s_%s ON %s(%s);', c.relname, a.attname, c.relname, a.attname)::text as suggested_index
  FROM pg_stats s
  JOIN pg_attribute a ON a.attname = s.attname
  JOIN pg_class c ON c.relname = s.tablename
  WHERE s.schemaname = 'public'
    AND s.n_distinct > 100
    AND abs(s.correlation) < 0.1
    AND NOT EXISTS (
      SELECT 1
      FROM pg_index i
      WHERE i.indrelid = c.oid
        AND a.attnum = ANY(i.indkey)
    )
  ORDER BY s.n_distinct DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Add comments to indexes for documentation
COMMENT ON INDEX idx_scripts_user_id IS 'Index for user-specific script queries';
COMMENT ON INDEX idx_scripts_category_id IS 'Index for category-based script filtering';
COMMENT ON INDEX idx_scripts_name_search IS 'Full-text search index for script names';
COMMENT ON INDEX idx_scripts_description_search IS 'Full-text search index for script descriptions';
COMMENT ON INDEX idx_scripts_content_hash IS 'Index for duplicate detection by content hash';
COMMENT ON INDEX idx_scripts_public_created IS 'Optimized index for public script listing';
COMMENT ON INDEX idx_script_executions_running IS 'Partial index for monitoring running executions';