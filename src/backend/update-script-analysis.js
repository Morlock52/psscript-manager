/**
 * Script to update AI analysis for all scripts in the database
 * 
 * This script will re-analyze all scripts using the improved AI analyzer
 * with proper rating scales and MS Learn documentation references.
 */

const { sequelize, Script, ScriptAnalysis } = require('./models');
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { createLogger, format, transports } = require('winston');

// Load environment variables
dotenv.config();

// Create a logger
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
      )
    }),
    new transports.File({ 
      filename: path.join(__dirname, '../../logs/script-analysis-update.log') 
    })
  ]
});

// Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const BATCH_SIZE = 10;
const CONCURRENT_REQUESTS = 3;
const DELAY_BETWEEN_BATCHES = 5000; // 5 seconds

// Process scripts in batches
async function processScripts() {
  try {
    // Get all scripts
    const scripts = await Script.findAll({
      attributes: ['id', 'title', 'content'],
      raw: true
    });
    
    logger.info(`Found ${scripts.length} scripts to analyze`);
    
    // Process in batches
    const batches = [];
    for (let i = 0; i < scripts.length; i += BATCH_SIZE) {
      batches.push(scripts.slice(i, i + BATCH_SIZE));
    }
    
    logger.info(`Processing ${batches.length} batches of ${BATCH_SIZE} scripts`);
    
    let totalSuccessful = 0;
    let totalFailed = 0;
    
    // Process each batch
    for (let i = 0; i < batches.length; i++) {
      logger.info(`Processing batch ${i + 1} of ${batches.length}`);
      
      // Process batch with limited concurrency
      const results = await processBatchWithConcurrency(batches[i], CONCURRENT_REQUESTS);
      
      // Count successes and failures
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      totalSuccessful += successful;
      totalFailed += failed;
      
      logger.info(`Batch ${i + 1} complete: ${successful} successful, ${failed} failed`);
      
      // Delay between batches to avoid overloading the AI service
      if (i < batches.length - 1) {
        logger.info(`Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }
    
    logger.info(`Analysis update complete: ${totalSuccessful} successful, ${totalFailed} failed`);
    return { totalSuccessful, totalFailed };
  } catch (error) {
    logger.error('Error processing scripts:', error);
    throw error;
  }
}

// Process a batch of scripts with limited concurrency
async function processBatchWithConcurrency(scriptsBatch, concurrentLimit) {
  const results = [];
  const chunks = [];
  
  // Split batch into chunks based on concurrency limit
  for (let i = 0; i < scriptsBatch.length; i += concurrentLimit) {
    chunks.push(scriptsBatch.slice(i, i + concurrentLimit));
  }
  
  // Process each chunk concurrently
  for (const chunk of chunks) {
    const chunkResults = await Promise.all(
      chunk.map(script => analyzeScript(script))
    );
    
    results.push(...chunkResults);
  }
  
  return results;
}

// Analyze a single script
async function analyzeScript(script) {
  const scriptId = script.id;
  const scriptTitle = script.title;
  
  logger.info(`Analyzing script ${scriptId}: ${scriptTitle}`);
  
  try {
    // Send script for analysis
    const analysisResponse = await axios.post(`${AI_SERVICE_URL}/analyze`, {
      script_id: scriptId,
      content: script.content,
      include_command_details: true,
      fetch_ms_docs: true
    }, {
      timeout: 30000 // 30 second timeout
    });
    
    const analysisData = analysisResponse.data;
    
    // Update or create analysis record
    await ScriptAnalysis.upsert({
      scriptId: scriptId,
      purpose: analysisData.purpose || 'No purpose provided',
      parameters: analysisData.parameters || {},
      securityScore: analysisData.security_score || 5.0,
      codeQualityScore: analysisData.code_quality_score || 5.0,
      riskScore: analysisData.risk_score || 5.0,
      optimizationSuggestions: analysisData.optimization || [],
      commandDetails: analysisData.command_details || [],
      msDocsReferences: analysisData.ms_docs_references || []
    });
    
    logger.info(`Successfully analyzed script ${scriptId}`);
    return { 
      scriptId, 
      success: true 
    };
  } catch (error) {
    logger.error(`Error analyzing script ${scriptId}:`, error.message);
    
    // Try to create a basic analysis if none exists
    try {
      const existingAnalysis = await ScriptAnalysis.findOne({ where: { scriptId } });
      
      if (!existingAnalysis) {
        await ScriptAnalysis.create({
          scriptId,
          purpose: 'Analysis pending',
          parameters: {},
          securityScore: 5.0,
          codeQualityScore: 5.0,
          riskScore: 5.0,
          optimizationSuggestions: [],
          commandDetails: [],
          msDocsReferences: []
        });
        
        logger.info(`Created default analysis for script ${scriptId}`);
      }
    } catch (fallbackError) {
      logger.error(`Error creating fallback analysis for script ${scriptId}:`, fallbackError.message);
    }
    
    return { 
      scriptId, 
      success: false, 
      error: error.message 
    };
  }
}

// Only run if executed directly
if (require.main === module) {
  logger.info('Starting script analysis update...');
  
  processScripts()
    .then(({ totalSuccessful, totalFailed }) => {
      logger.info(`Script analysis update complete. Successfully updated ${totalSuccessful} scripts, ${totalFailed} failed.`);
      process.exit(0);
    })
    .catch(error => {
      logger.error('Script analysis update failed:', error);
      process.exit(1);
    });
}

module.exports = { processScripts };