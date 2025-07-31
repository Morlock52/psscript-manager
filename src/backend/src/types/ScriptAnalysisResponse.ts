/**
 * Type definition for script analysis response from AI service
 * 
 * This interface defines the expected structure of the response from the AI service
 * to ensure consistent field mapping between the AI service and the backend.
 */

export interface ScriptAnalysisResponse {
  // General analysis information
  purpose: string;
  security_analysis?: string;
  security_score: number;
  code_quality_score: number;
  risk_score: number;
  reliability_score: number;
  category?: string;
  category_id?: number;
  
  // Script parameters documentation
  parameters: Record<string, any>;
  
  // Optimization and improvement suggestions
  optimization: string[]; // NOTE: This is the field name to use, not optimization_suggestions
  
  // Details about commands used in the script
  command_details: Record<string, any> | Array<any>;
  
  // Microsoft Learn documentation references
  ms_docs_references: Array<{
    command: string;
    url: string;
    description: string;
  }>;
  
  // Dependency information
  dependencies?: string[];
  
  // Additional fields for comprehensive analysis
  security_issues?: Array<any>;
  best_practice_violations?: Array<any>;
  performance_insights?: Array<any>;
  potential_risks?: Array<any>;
  code_complexity_metrics?: Record<string, any>;
  compatibility_notes?: string[];
  execution_summary?: Record<string, any>;
  analysis_version?: string;
  
  // Metadata
  analyzed_at?: number;
  model?: string;
}

// Example usage:
/*
import { ScriptAnalysisResponse } from '../types/ScriptAnalysisResponse';

// Type the response from AI service
const analysisResponse: ScriptAnalysisResponse = analysisData;

// Access fields with proper types
const score: number = analysisResponse.security_score;
const suggestions: string[] = analysisResponse.optimization;
*/