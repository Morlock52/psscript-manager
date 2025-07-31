/**
 * Script Analysis Tester
 * 
 * Tests the AI script analyzer with proper ratings and MS Learn documentation.
 */

const axios = require('axios');
const fs = require('fs');

// Configuration
const API_URL = process.env.BACKEND_URL || 'http://localhost:4001';
const TEST_SCRIPT_PATH = process.argv[2] || './test-script.ps1';

// Read the test script
let scriptContent;
try {
  scriptContent = fs.readFileSync(TEST_SCRIPT_PATH, 'utf8');
  console.log(`Read script from ${TEST_SCRIPT_PATH} (${scriptContent.length} bytes)`);
} catch (error) {
  console.error(`Error reading script file: ${error.message}`);
  process.exit(1);
}

// Test the analyzer
async function testAnalyzer() {
  try {
    console.log('Sending script for analysis...');
    
    const startTime = Date.now();
    const response = await axios.post(`${API_URL}/api/scripts/analyze`, {
      content: scriptContent
    });
    const endTime = Date.now();
    
    console.log(`Analysis completed in ${(endTime - startTime) / 1000} seconds\n`);
    
    // Display the analysis results
    const analysis = response.data;
    
    console.log('=== Script Analysis Results ===\n');
    console.log(`Purpose: ${analysis.purpose}\n`);
    
    console.log('Ratings:');
    console.log(`- Security Score: ${analysis.security_score}/10 (${getRatingDescription('security', analysis.security_score)})`);
    console.log(`- Code Quality: ${analysis.code_quality_score}/10 (${getRatingDescription('quality', analysis.code_quality_score)})`);
    console.log(`- Risk Level: ${analysis.risk_score}/10 (${getRatingDescription('risk', analysis.risk_score)})`);
    console.log(`- Reliability: ${analysis.reliability_score}/10 (${getRatingDescription('reliability', analysis.reliability_score)})\n`);
    
    console.log('Optimization Suggestions:');
    if (analysis.optimization && analysis.optimization.length > 0) {
      analysis.optimization.forEach((suggestion, index) => {
        console.log(`${index + 1}. ${suggestion}`);
      });
    } else {
      console.log('No optimization suggestions provided.');
    }
    
    console.log('\nMS Learn Documentation References:');
    if (analysis.ms_docs_references && analysis.ms_docs_references.length > 0) {
      analysis.ms_docs_references.forEach((ref, index) => {
        console.log(`${index + 1}. ${ref.command || 'Command'}: ${ref.url || 'No URL provided'}`);
        console.log(`   ${ref.description || 'No description provided'}`);
      });
    } else {
      console.log('No MS Learn documentation references provided.');
    }
    
    console.log('\nCommand Details:');
    if (analysis.command_details) {
      // Handle both array and object format
      if (Array.isArray(analysis.command_details)) {
        analysis.command_details.forEach((detail, index) => {
          console.log(`- Command ${index + 1}: ${JSON.stringify(detail)}`);
        });
      } else if (typeof analysis.command_details === 'object' && analysis.command_details !== null) {
        Object.entries(analysis.command_details).forEach(([command, details]) => {
          console.log(`- ${command}: ${typeof details === 'string' ? details : JSON.stringify(details)}`);
        });
      }
    } else {
      console.log('No command details provided.');
    }
    
    return true;
  } catch (error) {
    console.error('Analysis failed:', error.message);
    
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    
    return false;
  }
}

// Helper to get rating descriptions
function getRatingDescription(type, score) {
  const scoreNum = parseFloat(score);
  
  if (type === 'security') {
    if (scoreNum >= 7) return 'HIGH RISK - Severe security vulnerabilities';
    if (scoreNum >= 4) return 'MODERATE RISK - Security issues should be addressed';
    return 'LOW RISK - Minimal security concerns';
  }
  
  if (type === 'quality') {
    if (scoreNum >= 8) return 'EXCELLENT - Following best practices';
    if (scoreNum >= 5) return 'ACCEPTABLE - Some improvements needed';
    return 'POOR - Significant refactoring required';
  }
  
  if (type === 'risk') {
    if (scoreNum >= 7) return 'HIGH RISK - Careful review required';
    if (scoreNum >= 4) return 'MODERATE RISK - Use with caution';
    return 'LOW RISK - Minimal execution concerns';
  }
  
  if (type === 'reliability') {
    if (scoreNum >= 8) return 'ROBUST - Excellent error handling';
    if (scoreNum >= 5) return 'ADEQUATE - Basic error handling present';
    return 'FRAGILE - Poor error handling';
  }
  
  return 'Unknown rating type';
}

// Run the test
console.log('=== Testing Script Analysis ===');
testAnalyzer().then(success => {
  if (success) {
    console.log('\nTest completed successfully!');
  } else {
    console.error('\nTest failed. Please check the error messages above.');
  }
});