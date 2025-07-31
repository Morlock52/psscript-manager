#!/bin/bash
# Script to run the migration for adding agent tables to the database

# Load environment variables
if [ -f .env ]; then
    echo "Loading environment variables from .env file"
    export $(grep -v '^#' .env | xargs)
else
    echo "No .env file found, using default environment variables"
    # Default environment variables
    export DB_HOST=localhost
    export DB_PORT=5432
    export DB_NAME=psscript
    export DB_USER=postgres
    export DB_PASSWORD=postgres
fi

# Display the migration that will be run
echo "Running migration: add_agent_tables.sql"
echo "This migration adds tables for agent state, conversation history, and tool execution results"

# Run the migration
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f src/db/migrations/add_agent_tables.sql

# Check if the migration was successful
if [ $? -eq 0 ]; then
    echo "Migration completed successfully"
    
    # Verify that the tables were created
    echo "Verifying that the tables were created..."
    
    # Check agent_state table
    AGENT_STATE_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'agent_state';")
    if [ $AGENT_STATE_COUNT -gt 0 ]; then
        echo "✅ agent_state table created successfully"
    else
        echo "❌ agent_state table not created"
    fi
    
    # Check conversation_history table
    CONVERSATION_HISTORY_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'conversation_history';")
    if [ $CONVERSATION_HISTORY_COUNT -gt 0 ]; then
        echo "✅ conversation_history table created successfully"
    else
        echo "❌ conversation_history table not created"
    fi
    
    # Check tool_execution_results table
    TOOL_EXECUTION_RESULTS_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'tool_execution_results';")
    if [ $TOOL_EXECUTION_RESULTS_COUNT -gt 0 ]; then
        echo "✅ tool_execution_results table created successfully"
    else
        echo "❌ tool_execution_results table not created"
    fi
    
    # Check agent_performance_view view
    AGENT_PERFORMANCE_VIEW_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'agent_performance_view';")
    if [ $AGENT_PERFORMANCE_VIEW_COUNT -gt 0 ]; then
        echo "✅ agent_performance_view view created successfully"
    else
        echo "❌ agent_performance_view view not created"
    fi
    
    # Check tool_performance_view view
    TOOL_PERFORMANCE_VIEW_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.views WHERE table_name = 'tool_performance_view';")
    if [ $TOOL_PERFORMANCE_VIEW_COUNT -gt 0 ]; then
        echo "✅ tool_performance_view view created successfully"
    else
        echo "❌ tool_performance_view view not created"
    fi
    
    # Check cleanup_old_agent_states function
    CLEANUP_OLD_AGENT_STATES_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname = 'cleanup_old_agent_states';")
    if [ $CLEANUP_OLD_AGENT_STATES_COUNT -gt 0 ]; then
        echo "✅ cleanup_old_agent_states function created successfully"
    else
        echo "❌ cleanup_old_agent_states function not created"
    fi
    
    # Check cleanup_old_tool_results function
    CLEANUP_OLD_TOOL_RESULTS_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname = 'cleanup_old_tool_results';")
    if [ $CLEANUP_OLD_TOOL_RESULTS_COUNT -gt 0 ]; then
        echo "✅ cleanup_old_tool_results function created successfully"
    else
        echo "❌ cleanup_old_tool_results function not created"
    fi
    
    # Check get_recent_conversations function
    GET_RECENT_CONVERSATIONS_COUNT=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM pg_proc WHERE proname = 'get_recent_conversations';")
    if [ $GET_RECENT_CONVERSATIONS_COUNT -gt 0 ]; then
        echo "✅ get_recent_conversations function created successfully"
    else
        echo "❌ get_recent_conversations function not created"
    fi
    
    echo "Migration verification completed"
else
    echo "Migration failed"
    exit 1
fi

echo "Database is now ready for agentic capabilities"
