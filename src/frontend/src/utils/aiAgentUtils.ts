/**
 * Utility functions for working with the AI Agent
 * This provides helper methods for formatting AI analysis, fetching examples,
 * and handling the agentic workflow for script analysis
 */
import { AIAnalysisRequest, AIAnalysisResult, analyzeScriptWithAgent, getSimilarScriptExamples } from '../api/aiAgent';

/**
 * Helper interface for the AI Agent workflow state
 */
export interface AIAgentWorkflowState {
  isLoading: boolean;
  error: string | null;
  analysis: AIAnalysisResult | null;
  examples: any[];
  isExamplesLoading: boolean;
}

/**
 * Format a security score with color indicator
 * @param score The security score (0-100)
 * @returns Object with color and label
 */
export const formatSecurityScore = (score: number) => {
  if (score >= 90) return { color: 'success', label: 'Excellent' };
  if (score >= 70) return { color: 'success', label: 'Good' };
  if (score >= 50) return { color: 'warning', label: 'Moderate' };
  if (score >= 30) return { color: 'warning', label: 'Concerning' };
  return { color: 'error', label: 'Poor' };
};

/**
 * Format a risk score with color indicator
 * @param score The risk score (0-100, lower is better)
 * @returns Object with color and label
 */
export const formatRiskScore = (score: number) => {
  if (score <= 10) return { color: 'success', label: 'Minimal' };
  if (score <= 30) return { color: 'success', label: 'Low' };
  if (score <= 60) return { color: 'warning', label: 'Moderate' };
  if (score <= 80) return { color: 'warning', label: 'High' };
  return { color: 'error', label: 'Critical' };
};

/**
 * Format analysis summary information for display
 * @param analysis The AI analysis result
 * @returns Formatted summary information
 */
export const formatAnalysisSummary = (analysis: AIAnalysisResult | null) => {
  if (!analysis) return null;
  
  const { securityScore, codeQualityScore, riskScore } = analysis.analysis;
  
  return {
    security: formatSecurityScore(securityScore),
    quality: {
      color: codeQualityScore >= 70 ? 'success' : codeQualityScore >= 50 ? 'warning' : 'error',
      label: codeQualityScore >= 70 ? 'Good' : codeQualityScore >= 50 ? 'Moderate' : 'Poor',
    },
    risk: formatRiskScore(riskScore),
    overallStatus: 
      (securityScore >= 70 && codeQualityScore >= 70 && riskScore <= 30) ? 'safe' :
      (securityScore < 50 || codeQualityScore < 50 || riskScore > 70) ? 'warning' : 
      'caution'
  };
};

/**
 * Extract keywords from script analysis for search purposes
 * @param analysis The AI analysis result
 * @returns Array of relevant keywords
 */
export const extractKeywords = (analysis: AIAnalysisResult): string[] => {
  const keywords: string[] = [];
  
  // Add purpose keywords
  if (analysis.analysis.purpose) {
    keywords.push(...analysis.analysis.purpose.split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5));
  }
  
  // Add command names
  if (analysis.analysis.commandDetails) {
    keywords.push(...Object.keys(analysis.analysis.commandDetails));
  }
  
  // Return unique keywords
  return [...new Set(keywords)];
};

/**
 * Run a complete agentic AI workflow for script analysis
 * This handles the entire process from submitting the script to retrieving examples
 * 
 * @param scriptContent The PowerShell script to analyze
 * @param filename Optional filename
 * @param apiKey Optional OpenAI API key
 * @param includeInternetSearch Whether to include internet search in analysis
 * @returns Promise resolving to the workflow state
 */
export const runAIAgentWorkflow = async (
  scriptContent: string, 
  filename: string,
  apiKey?: string,
  includeInternetSearch = true
): Promise<AIAgentWorkflowState> => {
  console.log('Starting AI agent workflow analysis');
  
  const result: AIAgentWorkflowState = {
    isLoading: true,
    analysis: null,
    examples: [],
    error: null,
    isExamplesLoading: false
  };
  
  try {
    // Step 1: Send the script for AI analysis
    try {
      const analysisResult = await analyzeScriptWithAgent({
        content: scriptContent,
        filename,
        requestType: 'detailed',
        analysisOptions: {
          includeSimilarScripts: true,
          includeInternetSearch,
          maxExamples: 5
        }
      }, apiKey);
      
      result.analysis = analysisResult;
      
      if (analysisResult?.analysis?.examples?.length > 0) {
        result.examples = analysisResult.analysis.examples;
      }
    } catch (error) {
      console.error('Error in AI analysis:', error);
      if (error instanceof Error) {
        result.error = `Analysis error: ${error.message}`;
      } else {
        result.error = 'Failed to analyze script with AI';
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error in AI agent workflow:', error);
    throw error;
  } finally {
    result.isLoading = false;
  }
};

/**
 * Generate explanatory notes for PowerShell commands in script
 * @param script The PowerShell script content
 * @returns Object mapping commands to explanations
 */
export const generateCommandExplanations = async (
  script: string
): Promise<Record<string, string>> => {
  // Extract PowerShell commands from script
  const commandRegex = /\b(Get-|Set-|New-|Remove-|Add-|Clear-|Export-|Import-|Out-|Start-|Stop-|[A-Z][a-z]+\-[A-Za-z]+)\b/g;
  const matches = script.match(commandRegex) || [];
  const uniqueCommands = [...new Set(matches)];
  
  // Simple cache for command explanations
  const explanations: Record<string, string> = {};
  
  // Generate explanations from our known command database
  // In a real implementation, this would call an API or use a lookup table
  uniqueCommands.forEach(command => {
    switch(command) {
      case 'Get-Process':
        explanations[command] = 'Gets the processes that are running on the local computer or a remote computer.';
        break;
      case 'Get-Content':
        explanations[command] = 'Gets the content of the item at the specified location.';
        break;
      case 'Set-Location':
        explanations[command] = 'Sets the current working location to a specified location.';
        break;
      case 'New-Item':
        explanations[command] = 'Creates a new item.';
        break;
      default:
        explanations[command] = 'PowerShell command';
    }
  });
  
  return explanations;
};
