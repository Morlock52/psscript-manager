/**
 * PowerShell Security Analysis Utilities
 * Implements security analysis based on OWASP guidelines for PowerShell scripts
 */

import logger from './logger';

// OWASP PowerShell security categories aligned with OWASP Top 10
export const POWERSHELL_SECURITY_CATEGORIES = {
  INJECTION: 'Command Injection',
  BROKEN_AUTH: 'Broken Authentication',
  SENSITIVE_DATA: 'Sensitive Data Exposure',
  XXE: 'XML External Entities',
  BROKEN_ACCESS: 'Broken Access Control',
  SECURITY_MISCONFIG: 'Security Misconfiguration',
  XSS: 'Cross-Site Scripting',
  INSECURE_DESERIALIZATION: 'Insecure Deserialization',
  VULNERABLE_COMPONENTS: 'Using Components with Known Vulnerabilities',
  INSUFFICIENT_LOGGING: 'Insufficient Logging & Monitoring'
};

// Risk levels for security findings
export enum RiskLevel {
  CRITICAL = 'Critical',
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
  INFO = 'Info'
}

// Interface for OWASP vulnerabilities
export interface OWASPVulnerability {
  id: string;
  category: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  location?: {
    lineNumber: number;
    code: string;
  };
  remediation: string;
  reference?: string;
  cwe?: string; // Common Weakness Enumeration reference
}

// Interface for security analysis result
export interface SecurityAnalysisResult {
  owaspVulnerabilities: OWASPVulnerability[];
  owaspComplianceScore: number;
  injectionRisks: any[];
  authenticationIssues: any[];
  exposedCredentials: any[];
  insecureConfigurations: any[];
  securitySummary: string;
}

// Basic interface for the expected structure of AI analysis data
interface AIServiceAnalysisData {
  suggestions?: string[];
  security_score?: number;
  // Add other expected properties from AI service if known
  [key: string]: any; // Allow other properties
}

/**
 * Patterns for detecting potential security issues in PowerShell scripts
 */
const securityPatterns = {
  // Command Injection patterns
  commandInjection: [
    { pattern: /Invoke-Expression\s*\(\s*\$(?!.*Validated)/i, description: 'Unvalidated Invoke-Expression usage' },
    { pattern: /iex\s*\(\s*\$(?!.*Validated)/i, description: 'Unvalidated IEX usage (alias for Invoke-Expression)' },
    { pattern: /&\s*\(\s*\$(?!.*Validated)/i, description: 'Unvalidated script block invocation' },
    { pattern: /\|\s*(?:powershell|pwsh)/i, description: 'Potential pipeline command injection' }
  ],
  
  // Credential exposure patterns
  credentialExposure: [
    { pattern: /(password|passwd|pwd|credential|secret|token|key|api[\s_-]?key)\s*=\s*["'](?!.*\$)/i, description: 'Hardcoded credential' },
    { pattern: /ConvertTo-SecureString.*AsPlainText/i, description: 'Plain text conversion to secure string' },
    { pattern: /Net\.WebClient\.DownloadString|Invoke-WebRequest|Invoke-RestMethod/i, description: 'Network request without certificate validation' }
  ],
  
  // Authentication issues
  authenticationIssues: [
    { pattern: /Get-Credential(?!\s+.*prompt)/i, description: 'Get-Credential without explicit prompt' },
    { pattern: /PSCredential\s*\(\s*["'][^"']+["']\s*,/i, description: 'Hardcoded username in PSCredential' },
    { pattern: /New-Object\s+System\.Net\.NetworkCredential/i, description: 'Use of NetworkCredential instead of PSCredential' }
  ],
  
  // Configuration Security
  securityMisconfig: [
    { pattern: /Set-ExecutionPolicy\s+Unrestricted|Set-ExecutionPolicy\s+Bypass/i, description: 'Unrestricted execution policy' },
    { pattern: /\[Net\.ServicePointManager\]::ServerCertificateValidationCallback\s*=\s*\{\s*\$true\s*\}/i, description: 'Disabled certificate validation' },
    { pattern: /New-SelfSignedCertificate(?!.*NotExportable)/i, description: 'Self-signed certificate without export protection' }
  ],
  
  // Logging and Monitoring
  insufficientLogging: [
    { pattern: /Remove-EventLog|Clear-EventLog|Limit-EventLog/i, description: 'Event log manipulation' },
    { pattern: /Out-Null|silentlycontinue/i, description: 'Suppressed errors or output' }
  ]
};

/**
 * Analyzes PowerShell script content for OWASP security vulnerabilities
 * @param scriptContent - The PowerShell script content to analyze
 * @returns Security analysis results based on OWASP guidelines
 */
export const analyzeScriptSecurity = (scriptContent: string): SecurityAnalysisResult => {
  try {
    logger.info('Starting PowerShell script OWASP security analysis');
    
    // Normalize line endings and split into lines for better analysis
    const lines = scriptContent.replace(/\r\n/g, '\n').split('\n');
    
    // Initialize vulnerability collections
    const vulnerabilities: OWASPVulnerability[] = [];
    const injectionRisks: any[] = [];
    const authenticationIssues: any[] = [];
    const exposedCredentials: any[] = [];
    const insecureConfigurations: any[] = [];
    
    // Check for command injection vulnerabilities
    securityPatterns.commandInjection.forEach(pattern => {
      lines.forEach((line, index) => {
        if (pattern.pattern.test(line)) {
          const vuln: OWASPVulnerability = {
            id: `INJ-${vulnerabilities.length + 1}`,
            category: POWERSHELL_SECURITY_CATEGORIES.INJECTION,
            title: 'Command Injection Risk',
            description: `${pattern.description} detected`,
            riskLevel: RiskLevel.HIGH,
            location: {
              lineNumber: index + 1,
              code: line.trim()
            },
            remediation: 'Validate all input before using it in Invoke-Expression or similar commands. Consider using safer alternatives.',
            cwe: 'CWE-78'
          };
          
          vulnerabilities.push(vuln);
          injectionRisks.push({
            lineNumber: index + 1,
            code: line.trim(),
            description: pattern.description,
            risk: 'high'
          });
        }
      });
    });
    
    // Check for credential exposure
    securityPatterns.credentialExposure.forEach(pattern => {
      lines.forEach((line, index) => {
        if (pattern.pattern.test(line)) {
          const vuln: OWASPVulnerability = {
            id: `CRED-${vulnerabilities.length + 1}`,
            category: POWERSHELL_SECURITY_CATEGORIES.SENSITIVE_DATA,
            title: 'Credential Exposure',
            description: `${pattern.description} detected`,
            riskLevel: RiskLevel.CRITICAL,
            location: {
              lineNumber: index + 1,
              code: line.trim()
            },
            remediation: 'Use secure credential management. Store credentials in a secure credential manager or use environment variables.',
            cwe: 'CWE-798'
          };
          
          vulnerabilities.push(vuln);
          exposedCredentials.push({
            lineNumber: index + 1,
            code: line.trim(),
            description: pattern.description,
            risk: 'critical'
          });
        }
      });
    });
    
    // Check for authentication issues
    securityPatterns.authenticationIssues.forEach(pattern => {
      lines.forEach((line, index) => {
        if (pattern.pattern.test(line)) {
          const vuln: OWASPVulnerability = {
            id: `AUTH-${vulnerabilities.length + 1}`,
            category: POWERSHELL_SECURITY_CATEGORIES.BROKEN_AUTH,
            title: 'Authentication Issue',
            description: `${pattern.description} detected`,
            riskLevel: RiskLevel.MEDIUM,
            location: {
              lineNumber: index + 1,
              code: line.trim()
            },
            remediation: 'Use secure authentication practices. Avoid hardcoded credentials and use proper prompt messages.',
            cwe: 'CWE-287'
          };
          
          vulnerabilities.push(vuln);
          authenticationIssues.push({
            lineNumber: index + 1,
            code: line.trim(),
            description: pattern.description,
            risk: 'medium'
          });
        }
      });
    });
    
    // Check for security misconfigurations
    securityPatterns.securityMisconfig.forEach(pattern => {
      lines.forEach((line, index) => {
        if (pattern.pattern.test(line)) {
          const vuln: OWASPVulnerability = {
            id: `CONFIG-${vulnerabilities.length + 1}`,
            category: POWERSHELL_SECURITY_CATEGORIES.SECURITY_MISCONFIG,
            title: 'Security Misconfiguration',
            description: `${pattern.description} detected`,
            riskLevel: RiskLevel.HIGH,
            location: {
              lineNumber: index + 1,
              code: line.trim()
            },
            remediation: 'Follow security best practices for configuration. Use least privilege principle.',
            cwe: 'CWE-1004'
          };
          
          vulnerabilities.push(vuln);
          insecureConfigurations.push({
            lineNumber: index + 1,
            code: line.trim(),
            description: pattern.description,
            risk: 'high'
          });
        }
      });
    });
    
    // Check for insufficient logging
    securityPatterns.insufficientLogging.forEach(pattern => {
      lines.forEach((line, index) => {
        if (pattern.pattern.test(line)) {
          const vuln: OWASPVulnerability = {
            id: `LOG-${vulnerabilities.length + 1}`,
            category: POWERSHELL_SECURITY_CATEGORIES.INSUFFICIENT_LOGGING,
            title: 'Insufficient Logging',
            description: `${pattern.description} detected`,
            riskLevel: RiskLevel.LOW,
            location: {
              lineNumber: index + 1,
              code: line.trim()
            },
            remediation: 'Implement proper logging and error handling. Avoid suppressing errors.',
            cwe: 'CWE-778'
          };
          
          vulnerabilities.push(vuln);
        }
      });
    });
    
    // Calculate OWASP compliance score
    // Base score starts at 100 and is reduced based on findings
    let complianceScore = 100;
    
    // Deduct points based on severity
    vulnerabilities.forEach(vuln => {
      switch (vuln.riskLevel) {
        case RiskLevel.CRITICAL:
          complianceScore -= 20;
          break;
        case RiskLevel.HIGH:
          complianceScore -= 15;
          break;
        case RiskLevel.MEDIUM:
          complianceScore -= 10;
          break;
        case RiskLevel.LOW:
          complianceScore -= 5;
          break;
        case RiskLevel.INFO:
          complianceScore -= 1;
          break;
      }
    });
    
    // Ensure score doesn't go below 0
    complianceScore = Math.max(0, complianceScore);
    
    // Generate summary
    const criticalCount = vulnerabilities.filter(v => v.riskLevel === RiskLevel.CRITICAL).length;
    const highCount = vulnerabilities.filter(v => v.riskLevel === RiskLevel.HIGH).length;
    const mediumCount = vulnerabilities.filter(v => v.riskLevel === RiskLevel.MEDIUM).length;
    const lowCount = vulnerabilities.filter(v => v.riskLevel === RiskLevel.LOW).length;
    
    let securitySummary = `OWASP Security Analysis: `;
    
    if (vulnerabilities.length === 0) {
      securitySummary += 'No vulnerabilities detected';
    } else {
      securitySummary += `Found ${vulnerabilities.length} potential security issues: `;
      securitySummary += `${criticalCount} critical, ${highCount} high, ${mediumCount} medium, ${lowCount} low risk.`;
    }
    
    logger.info(`PowerShell script OWASP security analysis completed: ${securitySummary}`);
    
    return {
      owaspVulnerabilities: vulnerabilities,
      owaspComplianceScore: complianceScore,
      injectionRisks,
      authenticationIssues,
      exposedCredentials,
      insecureConfigurations,
      securitySummary
    };
  } catch (error) {
    logger.error('Error analyzing PowerShell script security:', error);
    return {
      owaspVulnerabilities: [],
      owaspComplianceScore: 0,
      injectionRisks: [],
      authenticationIssues: [],
      exposedCredentials: [],
      insecureConfigurations: [],
      securitySummary: 'Error analyzing script security'
    };
  }
};

/**
 * Generates PowerShell security recommendations based on analysis results
 * @param scriptContent - The PowerShell script content
 * @returns Security recommendations
 */
export const generateSecurityRecommendations = (scriptContent: string): string[] => {
  const recommendations: string[] = [];
  const analysis = analyzeScriptSecurity(scriptContent);
  
  // Add general recommendations
  recommendations.push('Use the Principle of Least Privilege when executing PowerShell scripts');
  recommendations.push('Validate all input before using it in dynamic script execution');
  recommendations.push('Use PowerShell constrained language mode in production environments');
  
  // Add specific recommendations based on findings
  if (analysis.injectionRisks.length > 0) {
    recommendations.push('Replace Invoke-Expression with safer alternatives when possible');
    recommendations.push('Validate and sanitize all user inputs before processing');
  }
  
  if (analysis.exposedCredentials.length > 0) {
    recommendations.push('Use a secure credential management system instead of hardcoded credentials');
    recommendations.push('Consider using environment variables or Azure Key Vault for secrets');
  }
  
  if (analysis.authenticationIssues.length > 0) {
    recommendations.push('Implement proper authentication with secure credential handling');
    recommendations.push('Always use explicit credential prompts with descriptive messages');
  }
  
  if (analysis.insecureConfigurations.length > 0) {
    recommendations.push('Avoid disabling security features like certificate validation');
    recommendations.push('Use the most restrictive execution policy that meets your needs');
  }
  
  // Add OWASP-specific recommendations
  recommendations.push('Follow OWASP secure coding practices for PowerShell scripts');
  recommendations.push('Implement comprehensive logging and error handling');
  recommendations.push('Use code signing for production PowerShell scripts');
  
  return recommendations;
};

/**
 * Enhances an existing script analysis with OWASP security information
 * @param analysisData - The existing analysis data
 * @param scriptContent - The PowerShell script content
 * @returns Enhanced analysis with OWASP security information
 */
export const enhanceAnalysisWithOWASP = (analysisData: AIServiceAnalysisData, scriptContent: string): any => {
  const securityAnalysis = analyzeScriptSecurity(scriptContent);
  
  // Enhance the analysis with OWASP-specific information
  return {
    ...analysisData,
    owaspVulnerabilities: securityAnalysis.owaspVulnerabilities,
    owaspComplianceScore: securityAnalysis.owaspComplianceScore,
    injectionRisks: securityAnalysis.injectionRisks,
    authenticationIssues: securityAnalysis.authenticationIssues,
    exposedCredentials: securityAnalysis.exposedCredentials,
    insecureConfigurations: securityAnalysis.insecureConfigurations,
    securitySummary: securityAnalysis.securitySummary,
    
    // Add OWASP recommendations to existing suggestions
    suggestions: [
      ...(analysisData.suggestions || []),
      ...generateSecurityRecommendations(scriptContent)
    ],
    
    // Adjust security score based on OWASP compliance
    security_score: Math.min(
      analysisData.security_score || 0,
      securityAnalysis.owaspComplianceScore / 10 // Scale to match existing score (0-10)
    )
  };
};
