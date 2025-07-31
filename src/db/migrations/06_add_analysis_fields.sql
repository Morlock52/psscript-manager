-- Add new comprehensive analysis fields to script_analysis table
ALTER TABLE script_analysis
ADD COLUMN security_issues JSONB DEFAULT '[]'::jsonb,
ADD COLUMN best_practice_violations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN performance_insights JSONB DEFAULT '[]'::jsonb,
ADD COLUMN potential_risks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN code_complexity_metrics JSONB DEFAULT '{}'::jsonb,
ADD COLUMN compatibility_notes JSONB DEFAULT '[]'::jsonb,
ADD COLUMN execution_summary JSONB DEFAULT '{}'::jsonb,
ADD COLUMN analysis_version VARCHAR(255) DEFAULT '1.0';

-- Add OWASP-specific security fields
ALTER TABLE script_analysis
ADD COLUMN owasp_vulnerabilities JSONB DEFAULT '[]'::jsonb,
ADD COLUMN owasp_compliance_score FLOAT DEFAULT 0,
ADD COLUMN injection_risks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN authentication_issues JSONB DEFAULT '[]'::jsonb,
ADD COLUMN exposed_credentials JSONB DEFAULT '[]'::jsonb,
ADD COLUMN insecure_configurations JSONB DEFAULT '[]'::jsonb;

-- Add comments for clarity
COMMENT ON COLUMN script_analysis.security_issues IS 'Detailed security issues found in the script, including severity and remediation steps';
COMMENT ON COLUMN script_analysis.best_practice_violations IS 'PowerShell best practice violations based on PSScriptAnalyzer rules';
COMMENT ON COLUMN script_analysis.performance_insights IS 'Performance optimization opportunities and insights';
COMMENT ON COLUMN script_analysis.potential_risks IS 'Potential risks identified in the script execution or implementation';
COMMENT ON COLUMN script_analysis.code_complexity_metrics IS 'Metrics about code complexity, including cyclomatic complexity, nesting levels, etc.';
COMMENT ON COLUMN script_analysis.compatibility_notes IS 'Notes about compatibility with different PowerShell versions and environments';
COMMENT ON COLUMN script_analysis.execution_summary IS 'Summary of script execution behavior, including resources accessed and modified';
COMMENT ON COLUMN script_analysis.analysis_version IS 'Version of the analysis engine used';
COMMENT ON COLUMN script_analysis.owasp_vulnerabilities IS 'OWASP Top 10 vulnerabilities found in the script';
COMMENT ON COLUMN script_analysis.owasp_compliance_score IS 'Compliance score based on OWASP guidelines (0-100)';
COMMENT ON COLUMN script_analysis.injection_risks IS 'Potential command injection vulnerabilities';
COMMENT ON COLUMN script_analysis.authentication_issues IS 'Authentication and authorization issues';
COMMENT ON COLUMN script_analysis.exposed_credentials IS 'Potentially exposed credentials or secrets';
COMMENT ON COLUMN script_analysis.insecure_configurations IS 'Insecure configuration settings';
