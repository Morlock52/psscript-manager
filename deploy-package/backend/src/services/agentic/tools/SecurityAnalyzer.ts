import { OpenAIApi, Configuration } from 'openai';
import dotenv from 'dotenv';

// Initialize environment variables
dotenv.config();

// Set up OpenAI API client
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

/**
 * Patterns and rules to check for security issues
 */
const SECURITY_PATTERNS = [
  {
    pattern: /(Invoke-Expression|IEX)\s*\(\s*.*\$.*\s*\)/i,
    description: 'Dynamic execution with Invoke-Expression (IEX) using variables can be dangerous',
    severity: 'High',
    remediation: 'Avoid using Invoke-Expression with variables. Use safer alternatives like approved cmdlets or functions.',
  },
  {
    pattern: /\bScriptBlock\.Create\(/i,
    description: 'Creating dynamic script blocks can be risky',
    severity: 'Medium',
    remediation: 'Avoid dynamic script block creation or ensure strict validation of inputs.',
  },
  {
    pattern: /(Start-Process|Invoke-Command|Invoke-Item)\s+.*\$(?!PSScriptRoot|PSCommandPath)/i,
    description: 'Executing commands with user-controlled input',
    severity: 'High',
    remediation: 'Validate user input thoroughly before using in execution commands.',
  },
  {
    pattern: /(New-Object\s+System\.Net\.WebClient|Invoke-WebRequest|Invoke-RestMethod).*\.(DownloadFile|DownloadString)/i,
    description: 'Downloading content from the internet',
    severity: 'Medium',
    remediation: 'Ensure URLs are from trusted sources and validate downloaded content before execution.',
  },
  {
    pattern: /\$ExecutionContext\.InvokeCommand\.ExpandString/i,
    description: 'String expansion can lead to injection attacks',
    severity: 'Medium',
    remediation: 'Avoid string expansion with untrusted input.',
  },
  {
    pattern: /Unprotect-CmsMessage/i,
    description: 'Decrypting protected content',
    severity: 'Low',
    remediation: 'Ensure proper key management and access controls.',
  },
  {
    pattern: /ConvertTo-SecureString.*\s+-AsPlainText/i,
    description: 'Converting plain text to secure string',
    severity: 'Medium',
    remediation: 'Avoid storing credentials in scripts. Use credential objects or secure credential stores.',
  },
  {
    pattern: /\bAdd-Type\b.*\bSystem\.Reflection\b/i,
    description: 'Using reflection to manipulate types',
    severity: 'Medium',
    remediation: 'Reflection can bypass security checks. Use with caution and validate all inputs.',
  },
  {
    pattern: /\$env:USERPROFILE|\$env:APPDATA|\$env:TEMP/i,
    description: 'Accessing user profile directories',
    severity: 'Low',
    remediation: 'Make sure operations in these directories are necessary and secure.',
  },
  {
    pattern: /Set-ExecutionPolicy\s+Unrestricted|Set-ExecutionPolicy\s+Bypass/i,
    description: 'Lowering execution policy security settings',
    severity: 'High',
    remediation: 'Avoid lowering execution policy. Use signed scripts or scoped policies instead.',
  },
];

/**
 * Function to analyze PowerShell script for security vulnerabilities
 * 
 * @param script The PowerShell script to analyze
 * @returns Analysis results as a formatted string
 */
export async function analyzeScriptSecurity(script: string): Promise<string> {
  try {
    // Check script against known patterns
    const patternFindings = checkSecurityPatterns(script);
    
    // Use AI to identify additional security concerns
    const aiAnalysis = await analyzeWithAI(script);
    
    // Combine results into a comprehensive report
    return formatAnalysisReport(script, patternFindings, aiAnalysis);
  } catch (error) {
    console.error('Error analyzing script security:', error);
    return `Error analyzing script security: ${error}`;
  }
}

/**
 * Check script against known security patterns
 */
function checkSecurityPatterns(script: string): any[] {
  const findings: any[] = [];
  
  SECURITY_PATTERNS.forEach(pattern => {
    const regex = new RegExp(pattern.pattern);
    if (regex.test(script)) {
      // Find all instances and their line numbers
      const lines = script.split('\n');
      const instances: number[] = [];
      
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          instances.push(index + 1);
        }
      });
      
      findings.push({
        ...pattern,
        instances,
      });
    }
  });
  
  return findings;
}

/**
 * Analyze script using AI
 */
async function analyzeWithAI(script: string): Promise<string> {
  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a PowerShell security expert. Analyze the provided PowerShell script for security vulnerabilities, poor practices, and potential improvements. Focus on security issues not covered by standard pattern matching such as logic flaws, authorization issues, sensitive data handling, etc.'
        },
        {
          role: 'user',
          content: `Analyze this PowerShell script for security issues:\n\n${script}\n\nProvide a detailed but concise analysis focusing on security vulnerabilities, with specific line references where appropriate.`
        }
      ],
      max_tokens: 1024,
    });
    
    return response.data.choices[0]?.message?.content || 'AI analysis not available.';
  } catch (error) {
    console.error('Error using AI for security analysis:', error);
    return 'Unable to perform AI-assisted analysis.';
  }
}

/**
 * Format the analysis report
 */
function formatAnalysisReport(script: string, patternFindings: any[], aiAnalysis: string): string {
  const scriptLines = script.split('\n');
  const scriptLength = scriptLines.length;
  
  // Calculate risk score
  const highSeverityCount = patternFindings.filter(f => f.severity === 'High').length;
  const mediumSeverityCount = patternFindings.filter(f => f.severity === 'Medium').length;
  const lowSeverityCount = patternFindings.filter(f => f.severity === 'Low').length;
  
  const riskScore = (highSeverityCount * 10 + mediumSeverityCount * 5 + lowSeverityCount * 2) / (scriptLength / 10);
  const normalizedRiskScore = Math.min(Math.max(riskScore, 0), 10);
  
  // Generate risk rating
  let riskRating = 'Low';
  if (normalizedRiskScore >= 7) riskRating = 'High';
  else if (normalizedRiskScore >= 3) riskRating = 'Medium';
  
  // Format findings
  let findingsSection = '';
  if (patternFindings.length > 0) {
    findingsSection = patternFindings.map((finding, index) => {
      return `
### ${index + 1}. ${finding.description}
- **Severity**: ${finding.severity}
- **Line(s)**: ${finding.instances.join(', ')}
- **Remediation**: ${finding.remediation}
`;
    }).join('\n');
  } else {
    findingsSection = 'No pattern-based security issues detected.';
  }
  
  // Assemble final report
  return `
# PowerShell Script Security Analysis

## Overview
- **Script Length**: ${scriptLength} lines
- **Risk Rating**: ${riskRating} (Score: ${normalizedRiskScore.toFixed(1)}/10)
- **Issues Found**: ${patternFindings.length} pattern-based issues

## Pattern-Based Findings
${findingsSection}

## AI Analysis
${aiAnalysis}

## Recommendations
1. Review the identified security issues and apply the suggested remediations.
2. Consider implementing least-privilege principles in your script.
3. Use PowerShell's built-in security features (ExecutionPolicy, AppLocker, etc.).
4. Follow secure coding practices such as input validation and proper error handling.
5. Consider code signing for production scripts.

`;
}
