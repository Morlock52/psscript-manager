-- SQL initialization for PSScript Manager database
-- Creates required extensions and tables.

-- pgvector extension for embedding storage
CREATE EXTENSION IF NOT EXISTS vector;

-- Example table for storing PowerShell scripts
CREATE TABLE IF NOT EXISTS scripts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    embedding vector(1536)
);
