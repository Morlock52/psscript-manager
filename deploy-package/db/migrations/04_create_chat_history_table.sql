-- Migration: 04_create_chat_history_table.sql
-- Description: Creates the chat_history table for storing chat conversations
-- with vector support for semantic search

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    messages JSONB NOT NULL,
    response TEXT NOT NULL,
    embedding vector(1536) NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at);

-- Add vector index for embedding search
-- This will enable fast similarity search
CREATE INDEX chat_history_embedding_idx ON chat_history USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Comment on table and columns
COMMENT ON TABLE chat_history IS 'Stores chat conversations between users and AI';
COMMENT ON COLUMN chat_history.user_id IS 'Reference to the user who initiated the chat';
COMMENT ON COLUMN chat_history.messages IS 'JSON array of chat messages with role and content';
COMMENT ON COLUMN chat_history.response IS 'The AI response text';
COMMENT ON COLUMN chat_history.embedding IS 'Vector embedding of the response for semantic search';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_chat_history_updated_at
    BEFORE UPDATE ON chat_history
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_history_updated_at();