-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Reset the public schema if exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public') THEN
        -- Keep this commented unless you want to reset the database
        -- DROP SCHEMA public CASCADE;
        -- CREATE SCHEMA public;
    END IF;
END $$;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Scripts table
CREATE TABLE scripts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    is_public BOOLEAN NOT NULL DEFAULT false,
    execution_count INTEGER NOT NULL DEFAULT 0,
    average_execution_time FLOAT,
    last_executed_at TIMESTAMP WITH TIME ZONE
);

-- Script versions table
CREATE TABLE script_versions (
    id SERIAL PRIMARY KEY,
    script_id INTEGER REFERENCES scripts(id),
    content TEXT NOT NULL,
    version INTEGER NOT NULL,
    user_id INTEGER REFERENCES users(id),
    commit_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(script_id, version)
);

-- Script tags relation
CREATE TABLE script_tags (
    script_id INTEGER REFERENCES scripts(id),
    tag_id INTEGER REFERENCES tags(id),
    PRIMARY KEY (script_id, tag_id)
);

-- AI Analysis table
CREATE TABLE script_analysis (
    id SERIAL PRIMARY KEY,
    script_id INTEGER REFERENCES scripts(id),
    purpose TEXT,
    security_score FLOAT,
    quality_score FLOAT,
    risk_score FLOAT,
    parameter_docs JSONB,
    suggestions JSONB,
    command_details JSONB DEFAULT '[]'::jsonb,
    ms_docs_references JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comments to explain the purpose of these columns
COMMENT ON COLUMN script_analysis.command_details IS 'Detailed analysis of PowerShell commands used in the script';
COMMENT ON COLUMN script_analysis.ms_docs_references IS 'References to Microsoft documentation for commands used in the script';

-- Vector embeddings table
CREATE TABLE script_embeddings (
    id SERIAL PRIMARY KEY,
    script_id INTEGER REFERENCES scripts(id) UNIQUE,
    embedding vector(1536),  -- OpenAI embedding size
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Script dependencies
CREATE TABLE script_dependencies (
    parent_script_id INTEGER REFERENCES scripts(id),
    child_script_id INTEGER REFERENCES scripts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (parent_script_id, child_script_id)
);

-- Script execution logs
CREATE TABLE execution_logs (
    id SERIAL PRIMARY KEY,
    script_id INTEGER REFERENCES scripts(id),
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(50) NOT NULL,
    execution_time FLOAT,
    parameters JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User favorites
CREATE TABLE user_favorites (
    user_id INTEGER REFERENCES users(id),
    script_id INTEGER REFERENCES scripts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, script_id)
);

-- Comments
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    script_id INTEGER REFERENCES scripts(id),
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_scripts_category ON scripts(category_id);
CREATE INDEX idx_scripts_user ON scripts(user_id);
CREATE INDEX idx_script_versions_script ON script_versions(script_id);
CREATE INDEX idx_script_analysis_script ON script_analysis(script_id);
CREATE INDEX idx_execution_logs_script ON execution_logs(script_id);
CREATE INDEX idx_execution_logs_user ON execution_logs(user_id);

-- Create vector index for similarity search
CREATE INDEX script_embeddings_idx ON script_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
