-- Migration to add tables for agent state, conversation history, and tool execution results
-- This migration adds support for storing agent state, conversation history, and tool execution results

-- Add support for storing agent state
CREATE TABLE IF NOT EXISTS agent_state (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(255) NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index on agent_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_agent_state_agent_id ON agent_state(agent_id);

-- Add support for storing conversation history
CREATE TABLE IF NOT EXISTS conversation_history (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL,
    messages JSONB NOT NULL,
    agent_type VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index on conversation_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_conversation_history_conversation_id ON conversation_history(conversation_id);
-- Add index on agent_type for filtering by agent type
CREATE INDEX IF NOT EXISTS idx_conversation_history_agent_type ON conversation_history(agent_type);

-- Add support for storing tool execution results
CREATE TABLE IF NOT EXISTS tool_execution_results (
    id SERIAL PRIMARY KEY,
    tool_name VARCHAR(255) NOT NULL,
    input JSONB NOT NULL,
    output JSONB NOT NULL,
    execution_time FLOAT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index on tool_name for faster lookups
CREATE INDEX IF NOT EXISTS idx_tool_execution_results_tool_name ON tool_execution_results(tool_name);
-- Add index on execution_time for performance analysis
CREATE INDEX IF NOT EXISTS idx_tool_execution_results_execution_time ON tool_execution_results(execution_time);

-- Add a view for agent performance analysis
CREATE OR REPLACE VIEW agent_performance_view AS
SELECT 
    agent_type,
    COUNT(DISTINCT conversation_id) AS conversation_count,
    AVG(JSONB_ARRAY_LENGTH(messages)) AS avg_messages_per_conversation,
    MIN(created_at) AS first_conversation,
    MAX(created_at) AS last_conversation
FROM conversation_history
GROUP BY agent_type;

-- Add a view for tool performance analysis
CREATE OR REPLACE VIEW tool_performance_view AS
SELECT 
    tool_name,
    COUNT(*) AS execution_count,
    AVG(execution_time) AS avg_execution_time,
    MIN(execution_time) AS min_execution_time,
    MAX(execution_time) AS max_execution_time,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_time) AS median_execution_time,
    MIN(created_at) AS first_execution,
    MAX(created_at) AS last_execution
FROM tool_execution_results
GROUP BY tool_name;

-- Add a function to clean up old agent states
CREATE OR REPLACE FUNCTION cleanup_old_agent_states(days_to_keep INTEGER)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM agent_state
    WHERE created_at < NOW() - (days_to_keep * INTERVAL '1 day');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add a function to clean up old tool execution results
CREATE OR REPLACE FUNCTION cleanup_old_tool_results(days_to_keep INTEGER)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM tool_execution_results
    WHERE created_at < NOW() - (days_to_keep * INTERVAL '1 day');
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add a function to get the most recent conversation for a given agent type
CREATE OR REPLACE FUNCTION get_recent_conversations(agent_type_param VARCHAR, limit_param INTEGER)
RETURNS TABLE (
    conversation_id VARCHAR,
    messages JSONB,
    agent_type VARCHAR,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ch.conversation_id,
        ch.messages,
        ch.agent_type,
        ch.created_at
    FROM conversation_history ch
    WHERE ch.agent_type = agent_type_param
    ORDER BY ch.created_at DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;
