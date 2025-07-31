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
 * Generate a PowerShell script based on user requirements
 * 
 * @param requirements The requirements for the script
 * @returns Generated PowerShell script as a string
 */
export async function generatePowerShellScript(requirements: string): Promise<string> {
  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert PowerShell script generator. Your task is to create well-structured, secure, and efficient PowerShell scripts that meet user requirements.

Guidelines for generating scripts:
1. Follow PowerShell best practices and style conventions
2. Include proper error handling with try/catch blocks
3. Use parameter validation attributes
4. Add clear comments and documentation
5. Follow the principle of least privilege
6. Create modular, reusable functions
7. Include script help (comment-based help)
8. Use secure coding patterns
9. Avoid deprecated cmdlets and syntax
10. Prioritize PowerShell 7+ compatible code unless otherwise specified

Format your response as a complete, ready-to-run PowerShell script.`
        },
        {
          role: 'user',
          content: `Generate a PowerShell script that satisfies these requirements:\n\n${requirements}`
        }
      ],
      max_tokens: 2048,
    });
    
    const script = response.data.choices[0]?.message?.content || 'Script generation failed.';
    
    // Analyze the script for security issues before returning
    const securityAnalysis = await analyzeScriptSecurity(script);
    
    return formatScriptWithAnalysis(script, securityAnalysis);
  } catch (error) {
    console.error('Error generating PowerShell script:', error);
    return `Error generating PowerShell script: ${error}`;
  }
}

/**
 * Simple security analysis for generated scripts
 * This is a simplified version of the full SecurityAnalyzer
 */
async function analyzeScriptSecurity(script: string): Promise<string> {
  // Define basic security patterns to check
  const securityPatterns = [
    {
      pattern: /(Invoke-Expression|IEX)\s*\(\s*.*\$.*\s*\)/i,
      description: 'Dynamic execution with Invoke-Expression (IEX) using variables',
    },
    {
      pattern: /Start-Process\s+.*\$(?!PSScriptRoot|PSCommandPath)/i,
      description: 'Starting processes with user-controlled input',
    },
    {
      pattern: /ConvertTo-SecureString.*\s+-AsPlainText/i,
      description: 'Converting plain text to secure string',
    },
    {
      pattern: /Set-ExecutionPolicy\s+Unrestricted|Set-ExecutionPolicy\s+Bypass/i,
      description: 'Lowering execution policy security settings',
    },
  ];
  
  // Check for security issues
  const issues = [];
  for (const pattern of securityPatterns) {
    if (pattern.pattern.test(script)) {
      issues.push(pattern.description);
    }
  }
  
  if (issues.length > 0) {
    return `
## Security Notice
This script includes the following potential security concerns:
${issues.map(issue => `- ${issue}`).join('\n')}

Please review the script carefully before execution.`;
  }
  
  return '';
}

/**
 * Format the final script output with security analysis
 */
function formatScriptWithAnalysis(script: string, securityAnalysis: string): string {
  if (securityAnalysis) {
    return `# Generated PowerShell Script
${script}

${securityAnalysis}`;
  }
  
  return script;
}
