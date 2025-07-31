-- Add file_hash column to scripts table for file integrity verification
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS file_hash VARCHAR(255);

-- Add index on file_hash for faster duplicate detection
CREATE INDEX IF NOT EXISTS idx_scripts_file_hash ON scripts(file_hash);

-- Comment explaining the migration
COMMENT ON COLUMN scripts.file_hash IS 'MD5 hash of the script file for integrity verification and deduplication';

-- Note: Vector embedding functionality is disabled because pgvector extension is not installed
-- To enable vector search, install pgvector extension and run the following SQL:
-- 
-- ALTER TABLE scripts ADD COLUMN IF NOT EXISTS embedding vector(1536);
-- CREATE INDEX IF NOT EXISTS idx_scripts_embedding ON scripts USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- COMMENT ON COLUMN scripts.embedding IS 'Vector embedding of script content for semantic search';
