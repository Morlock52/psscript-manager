-- Migration to upgrade embeddings from 1536 to 3072 dimensions for text-embedding-3-large
-- This migration will update the vector column size and recreate indexes

-- 1. Drop existing indexes
DROP INDEX IF EXISTS script_embeddings_idx;
DROP INDEX IF EXISTS script_embeddings_hnsw_idx;
DROP INDEX IF EXISTS chat_history_embedding_idx;

-- 2. Create new columns for larger embeddings
ALTER TABLE script_embeddings ADD COLUMN embedding_new vector(3072);
ALTER TABLE chat_history ADD COLUMN embedding_new vector(3072);

-- 3. Copy existing embeddings (they will need to be regenerated)
-- We'll mark them as NULL to indicate they need regeneration
UPDATE script_embeddings SET embedding_new = NULL;
UPDATE chat_history SET embedding_new = NULL;

-- 4. Drop old columns
ALTER TABLE script_embeddings DROP COLUMN embedding;
ALTER TABLE chat_history DROP COLUMN embedding;

-- 5. Rename new columns
ALTER TABLE script_embeddings RENAME COLUMN embedding_new TO embedding;
ALTER TABLE chat_history RENAME COLUMN embedding_new TO embedding;

-- 6. Add metadata column to track embedding model version
ALTER TABLE script_embeddings ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50) DEFAULT 'text-embedding-3-large';
ALTER TABLE script_embeddings ADD COLUMN IF NOT EXISTS embedding_dimensions INTEGER DEFAULT 3072;
ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(50) DEFAULT 'text-embedding-3-large';

-- 7. Recreate indexes with new dimensions
CREATE INDEX script_embeddings_hnsw_idx 
ON script_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX chat_history_embedding_hnsw_idx 
ON chat_history USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 8. Update the hybrid search function to work with new dimensions
DROP FUNCTION IF EXISTS hybrid_script_search;

CREATE OR REPLACE FUNCTION hybrid_script_search(
  query_text TEXT,
  query_embedding vector(3072),
  limit_count INT DEFAULT 10,
  text_weight FLOAT DEFAULT 0.3,
  vector_weight FLOAT DEFAULT 0.7,
  category_filter TEXT DEFAULT NULL
) RETURNS TABLE (
  id INTEGER,
  title VARCHAR,
  description TEXT,
  category VARCHAR,
  text_rank FLOAT,
  vector_similarity FLOAT,
  combined_score FLOAT
) AS $$
WITH text_search AS (
  SELECT 
    s.id,
    ts_rank_cd(s.search_vector, plainto_tsquery('english', query_text)) AS rank
  FROM scripts s
  WHERE s.search_vector @@ plainto_tsquery('english', query_text)
    AND (category_filter IS NULL OR s.category = category_filter)
),
vector_search AS (
  SELECT 
    se.script_id,
    1 - (se.embedding <=> query_embedding) AS similarity
  FROM script_embeddings se
  WHERE se.embedding IS NOT NULL
  ORDER BY se.embedding <=> query_embedding
  LIMIT limit_count * 2
)
SELECT DISTINCT
  s.id,
  s.title,
  s.description,
  s.category,
  COALESCE(ts.rank, 0) AS text_rank,
  COALESCE(vs.similarity, 0) AS vector_similarity,
  (COALESCE(ts.rank, 0) * text_weight + COALESCE(vs.similarity, 0) * vector_weight) AS combined_score
FROM scripts s
LEFT JOIN text_search ts ON s.id = ts.id
LEFT JOIN vector_search vs ON s.id = vs.script_id
WHERE ts.id IS NOT NULL OR vs.script_id IS NOT NULL
  AND (category_filter IS NULL OR s.category = category_filter)
ORDER BY combined_score DESC
LIMIT limit_count;
$$ LANGUAGE SQL STABLE;

-- 9. Add a function to check which scripts need embedding regeneration
CREATE OR REPLACE FUNCTION scripts_needing_embeddings() 
RETURNS TABLE (
  script_id INTEGER,
  title VARCHAR,
  has_old_embedding BOOLEAN
) AS $$
SELECT 
  s.id as script_id,
  s.title,
  se.embedding IS NOT NULL as has_old_embedding
FROM scripts s
LEFT JOIN script_embeddings se ON s.id = se.script_id
WHERE se.embedding IS NULL 
   OR se.embedding_model != 'text-embedding-3-large'
   OR se.embedding_dimensions != 3072
ORDER BY s.id;
$$ LANGUAGE SQL;

-- Add comment about the migration
COMMENT ON COLUMN script_embeddings.embedding IS 'Vector embedding of script content using text-embedding-3-large (3072 dimensions)';
COMMENT ON COLUMN chat_history.embedding IS 'Vector embedding of chat response using text-embedding-3-large (3072 dimensions)';