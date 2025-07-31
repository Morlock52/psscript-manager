-- Add command_details and ms_docs_references columns to script_analysis table
ALTER TABLE script_analysis ADD COLUMN command_details JSONB DEFAULT '[]'::jsonb;
ALTER TABLE script_analysis ADD COLUMN ms_docs_references JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the purpose of these columns
COMMENT ON COLUMN script_analysis.command_details IS 'Detailed analysis of PowerShell commands used in the script';
COMMENT ON COLUMN script_analysis.ms_docs_references IS 'References to Microsoft documentation for commands used in the script';
