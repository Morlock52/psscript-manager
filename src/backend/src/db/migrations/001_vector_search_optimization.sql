-- Vector Search Optimization Migration
-- Implements HNSW indexing and hybrid search capabilities

-- Drop existing index if it exists
DROP INDEX IF EXISTS script_embeddings_idx;

-- Create HNSW index for better performance (9x faster than IVFFlat)
CREATE INDEX IF NOT EXISTS script_embeddings_hnsw_idx 
ON script_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Add text search vector column for hybrid search
ALTER TABLE scripts ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create index for text search
CREATE INDEX IF NOT EXISTS scripts_search_vector_idx ON scripts USING gin(search_vector);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_script_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS script_search_vector_update ON scripts;
CREATE TRIGGER script_search_vector_update
  BEFORE INSERT OR UPDATE ON scripts
  FOR EACH ROW
  EXECUTE FUNCTION update_script_search_vector();

-- Update existing scripts with search vectors
UPDATE scripts SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'C');

-- Create function for hybrid search
CREATE OR REPLACE FUNCTION hybrid_script_search(
  query_text TEXT,
  query_embedding vector(1536),
  text_weight FLOAT DEFAULT 0.3,
  vector_weight FLOAT DEFAULT 0.7,
  limit_count INT DEFAULT 10
)
RETURNS TABLE (
  script_id INT,
  title VARCHAR(255),
  description TEXT,
  text_rank FLOAT,
  vector_similarity FLOAT,
  combined_score FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH text_search AS (
    SELECT 
      s.id,
      ts_rank_cd(s.search_vector, plainto_tsquery('english', query_text)) AS rank
    FROM scripts s
    WHERE s.search_vector @@ plainto_tsquery('english', query_text)
  ),
  vector_search AS (
    SELECT 
      se.script_id,
      1 - (se.embedding <=> query_embedding) AS similarity
    FROM script_embeddings se
    ORDER BY se.embedding <=> query_embedding
    LIMIT limit_count * 2
  )
  SELECT 
    s.id AS script_id,
    s.title,
    s.description,
    COALESCE(ts.rank, 0) AS text_rank,
    COALESCE(vs.similarity, 0) AS vector_similarity,
    (COALESCE(ts.rank, 0) * text_weight + COALESCE(vs.similarity, 0) * vector_weight) AS combined_score
  FROM scripts s
  LEFT JOIN text_search ts ON s.id = ts.id
  LEFT JOIN vector_search vs ON s.id = vs.script_id
  WHERE ts.id IS NOT NULL OR vs.script_id IS NOT NULL
  ORDER BY combined_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Add index on script_embeddings script_id for faster joins
CREATE INDEX IF NOT EXISTS script_embeddings_script_id_idx ON script_embeddings(script_id);

-- Analyze tables for query planner optimization
ANALYZE scripts;
ANALYZE script_embeddings;