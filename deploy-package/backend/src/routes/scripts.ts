// @ts-nocheck - Required for middleware integration and route parameter handling
import express from 'express';
import ScriptController from '../controllers/ScriptController';
import { authenticateJWT } from '../middleware/authMiddleware';
import upload, { handleMulterError, diskUpload, handleUploadProgress } from '../middleware/uploadMiddleware';
import { uploadSecurityMiddleware } from '../middleware/securityMiddleware';
import { sequelize } from '../database/connection';
import { Script, ScriptAnalysis, ScriptTag, ScriptVersion, ExecutionLog } from '../models';
import { cache } from '../index';
import { handleNetworkErrors } from '../middleware/networkErrorMiddleware';
import AsyncUploadController from '../controllers/AsyncUploadController';
import {
  createValidator,
  scriptListValidationRules,
  scriptIdValidationRules,
  scriptCreateUpdateValidationRules,
  scriptExecutionValidationRules,
  scriptAnalysisValidationRules,
  scriptUploadValidationRules,
  batchOperationValidationRules
} from '../middleware/validators/scriptValidators';
import {
  apiRateLimiter,
  uploadRateLimiter,
  executionRateLimiter,
  aiAnalysisRateLimiter,
  searchRateLimiter
} from '../middleware/rateLimitMiddleware';

const router = express.Router();

// Security is handled at the app level, no need for route-level CORS

/**
 * @swagger
 * /api/scripts/upload/async:
 *   post:
 *     summary: Upload files asynchronously
 *     description: Upload files for async processing with queuing
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - files
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       202:
 *         description: Files uploaded and queued for processing
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
router.post('/upload/async', ...uploadSecurityMiddleware, uploadRateLimiter, authenticateJWT, AsyncUploadController.uploadFiles);

/**
 * @swagger
 * /api/scripts/upload/status/{uploadId}:
 *   get:
 *     summary: Get upload status
 *     description: Check the status of an asynchronous upload
 *     parameters:
 *       - in: path
 *         name: uploadId
 *         required: true
 *         schema:
 *           type: string
 *         description: Upload ID
 *     responses:
 *       200:
 *         description: Upload status
 *       404:
 *         description: Upload not found
 */
router.get('/upload/status/:uploadId', AsyncUploadController.getUploadStatus);

/**
 * @swagger
 * /api/scripts:
 *   get:
 *     summary: Get all scripts with pagination and filtering
 *     description: Returns a list of scripts with optional filtering and pagination
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page (default 10)
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *         description: Filter by user ID
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *         description: Sort field (default 'updatedAt')
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *         description: Sort order (default 'DESC')
 *     responses:
 *       200:
 *         description: A list of scripts
 */
router.get('/', apiRateLimiter, createValidator(scriptListValidationRules), ScriptController.getScripts);

/**
 * @swagger
 * /api/scripts/search:
 *   get:
 *     summary: Search scripts
 *     description: Search scripts by keyword and optional filters
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Filter by category ID
 *       - in: query
 *         name: qualityThreshold
 *         schema:
 *           type: number
 *         description: Minimum code quality score
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page (default 10)
 *     responses:
 *       200:
 *         description: Search results
 */
router.get('/search', searchRateLimiter, createValidator(scriptListValidationRules), ScriptController.searchScripts);

/**
 * @swagger
 * /api/scripts/{id}:
 *   get:
 *     summary: Get a script by ID
 *     description: Returns detailed information about a specific script
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Script ID
 *     responses:
 *       200:
 *         description: Script details
 *       404:
 *         description: Script not found
 */
router.get('/:id', apiRateLimiter, createValidator(scriptIdValidationRules), ScriptController.getScript);

/**
 * @swagger
 * /api/scripts:
 *   post:
 *     summary: Create a new script
 *     description: Creates a new script with optional AI analysis
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               content:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Created script
 *       401:
 *         description: Unauthorized
 */
// Route for handling JSON uploads
router.post('/', apiRateLimiter, authenticateJWT, createValidator(scriptCreateUpdateValidationRules), ScriptController.createScript); // Re-enabled authentication

/**
 * @swagger
 * /api/scripts/upload:
 *   post:
 *     summary: Upload a PowerShell script file
 *     description: Upload a PowerShell script file with metadata
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - script_file
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               script_file:
 *                 type: string
 *                 format: binary
 *               category_id:
 *                 type: string
 *               tags:
 *                 type: string
 *               is_public:
 *                 type: string
 *               analyze_with_ai:
 *                 type: string
 *     responses:
 *       201:
 *         description: Script uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
// Use special CORS middleware and network error handling for upload endpoints
router.post('/upload', ...uploadSecurityMiddleware, uploadRateLimiter, authenticateJWT, createValidator(scriptUploadValidationRules), handleNetworkErrors, handleUploadProgress, upload.single('script_file'), handleMulterError, ScriptController.uploadScript); // Added authenticateJWT

/**
 * @swagger
 * /api/scripts/clear-cache:
 *   get:
 *     summary: Clear scripts cache
 *     description: Clears the in-memory cache for scripts to ensure fresh data
 *     responses:
 *       200:
 *         description: Cache cleared successfully
 */
router.get('/clear-cache', authenticateJWT, apiRateLimiter, async (req, res) => {
  try {
    const { cache } = await import('../index');
    const count = cache.clearPattern('scripts:');
    res.status(200).json({
      message: 'Scripts cache cleared successfully',
      entriesRemoved: count
    });
  } catch (error) {
    console.error('Error clearing scripts cache:', error);
    res.status(500).json({ message: 'Failed to clear cache' });
  }
});

/**
 * @swagger
 * /api/scripts/upload/large:
 *   post:
 *     summary: Upload a large PowerShell script file
 *     description: Upload a large PowerShell script file (up to 10MB) with metadata
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - script_file
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               script_file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Script uploaded successfully
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
// Use special CORS middleware and network error handling for large upload endpoint as well
router.post('/upload/large', uploadCorsMiddleware, authenticateJWT, handleNetworkErrors, handleUploadProgress, diskUpload.single('script_file'), handleMulterError, ScriptController.uploadScript); // Added authenticateJWT

/**
 * @swagger
 * /api/scripts/{id}:
 *   put:
 *     summary: Update a script
 *     description: Updates an existing script
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Script ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               content:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               isPublic:
 *                 type: boolean
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Updated script
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Script not found
 */
router.put('/:id', /* authenticateJWT, */ ScriptController.updateScript);

/**
 * @swagger
 * /api/scripts/{id}:
 *   delete:
 *     summary: Delete a script
 *     description: Deletes an existing script
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Script ID
 *     responses:
 *       200:
 *         description: Deletion confirmation
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Script not found
 */
router.delete('/:id', authenticateJWT, ScriptController.deleteScript); // Re-enabled authentication

/**
 * @swagger
 * /api/scripts/{id}/analysis:
 *   get:
 *     summary: Get script analysis
 *     description: Returns the AI analysis for a script
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Script ID
 *     responses:
 *       200:
 *         description: Script analysis
 *       404:
 *         description: Analysis not found
 */
router.get('/:id/analysis', ScriptController.getScriptAnalysis);

/**
 * @swagger
 * /api/scripts/{id}/analyze:
 *   post:
 *     summary: Analyze a script and save the analysis
 *     description: Analyzes a script with AI and saves the analysis to the database
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Script ID
 *     responses:
 *       200:
 *         description: Script analysis
 *       400:
 *         description: Bad request
 *       404:
 *         description: Script not found
 */
router.post('/:id/analyze', /* authenticateJWT, */ ScriptController.analyzeScriptAndSave);

/**
 * @swagger
 * /api/scripts/{id}/execute:
 *   post:
 *     summary: Execute a script
 *     description: Executes a script with optional parameters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Script ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               params:
 *                 type: object
 *     responses:
 *       200:
 *         description: Execution results
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Script not found
 */
router.post('/:id/execute', authenticateJWT, ScriptController.executeScript); // Re-enabled authentication

/**
 * @swagger
 * /api/scripts/{id}/similar:
 *   get:
 *     summary: Find similar scripts
 *     description: Returns scripts similar to the specified script
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Script ID
 *     responses:
 *       200:
 *         description: Similar scripts
 */
router.get('/:id/similar', ScriptController.findSimilarScripts);

/**
 * @swagger
 * /api/scripts/analyze:
 *   post:
 *     summary: Analyze a script without saving
 *     description: Returns AI analysis for a script without storing it
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Script analysis
 *       400:
 *         description: Bad request
 */
router.post('/analyze', ScriptController.analyzeScript);

/**
 * @swagger
 * /api/scripts/delete:
 *   post:
 *     summary: Delete multiple scripts
 *     description: Deletes multiple scripts by their IDs
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ids
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Deletion confirmation
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: One or more scripts not found
 */
// Use the controller method for bulk deletion - ensure authentication is applied
router.post('/delete', authenticateJWT, ScriptController.deleteMultipleScripts);

// Add new endpoint for AI script generation
/**
 * @swagger
 * /api/scripts/generate:
 *   post:
 *     summary: Generate a PowerShell script using AI
 *     description: Uses the AI service to generate PowerShell scripts based on a description
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *             properties:
 *               description:
 *                 type: string
 *                 description: Description of the script to generate
 *     responses:
 *       200:
 *         description: Successfully generated script
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 content:
 *                   type: string
 *                   description: Generated script content
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
// Note: This route was already public
router.post('/generate', async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({
        message: 'Description is required',
        status: 'error'
      });
    }

    // For now returning a mock response since we're using a mock AI service
    const mockScriptContent = `
# Script to ${description}
# Generated by PSScript AI Assistant

# Function to log messages
function Write-Log {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,

        [Parameter(Mandatory=$false)]
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

Write-Log -Message "Starting script execution" -Level "INFO"

# Main script logic would be implemented here
# This is a placeholder implementation
Write-Log -Message "Script purpose: ${description}" -Level "INFO"

# Sample code based on the description
Write-Log -Message "Executing main functionality..." -Level "INFO"
# Add your main code here

Write-Log -Message "Script execution completed" -Level "INFO"
    `;

    res.json({ content: mockScriptContent });
  } catch (error) {
    console.error('Error generating script:', error);
    res.status(500).json({
      message: 'Failed to generate script',
      status: 'error',
      error: error.message
    });
  }
});

// Add a new route for analyzing scripts with OpenAI Assistant
router.post('/analyze/assistant', /* authenticateJWT, */ ScriptController.analyzeScriptWithAssistant.bind(ScriptController));

/**
 * @swagger
 * /api/scripts/analyze/security:
 *   post:
 *     summary: Perform OWASP security analysis on a PowerShell script
 *     description: Analyzes a PowerShell script for security vulnerabilities using OWASP guidelines
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: PowerShell script content to analyze
 *     responses:
 *       200:
 *         description: Security analysis results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 owaspVulnerabilities:
 *                   type: array
 *                   description: OWASP security vulnerabilities found
 *                 owaspComplianceScore:
 *                   type: number
 *                   description: OWASP compliance score (0-100)
 *                 securitySummary:
 *                   type: string
 *                   description: Summary of security analysis
 *       400:
 *         description: Bad request - missing script content
 */
router.post('/analyze/security', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        message: 'Script content is required',
        status: 'error'
      });
    }

    // Import the security analysis utilities
    const { analyzeScriptSecurity, generateSecurityRecommendations } = require('../utils/powershellSecurityUtils');

    // Perform security analysis
    const securityAnalysis = analyzeScriptSecurity(content);

    // Generate recommendations
    const recommendations = generateSecurityRecommendations(content);

    // Combine results
    const result = {
      ...securityAnalysis,
      recommendations
    };

    return res.json(result);
  } catch (error) {
    console.error('Error in script security analysis endpoint:', error);
    return res.status(500).json({
      message: 'Failed to analyze script security',
      status: 'error'
    });
  }
});

/**
 * Endpoint to handle AI assistant question answering
 */
router.post('/please', async (req, res) => {
  try {
    const { question, context, useAgent = false } = req.body;

    if (!question) {
      return res.status(400).json({
        message: 'Question is required',
        status: 'error'
      });
    }

    // Generate a response based on the question type
    let response = '';

    if (question.toLowerCase().includes('explain')) {
      response = `This PowerShell script appears to ${context ? 'perform the following operations:\n\n' : 'be a question about explanation. Could you provide the script you\'d like me to explain?'}`;
      if (context) {
        response += `1. It ${context.includes('Get-') ? 'retrieves' : 'performs'} operations on your system\n`;
        response += `2. It uses PowerShell cmdlets for automation\n`;
        response += `3. It ${context.includes('function') ? 'defines custom functions' : 'uses built-in commands'} for its tasks`;
      }
    } else if (question.toLowerCase().includes('create') || question.toLowerCase().includes('generate')) {
      response = `Here's a PowerShell script that addresses your request:\n\n\`\`\`powershell\n# Script to address: ${question}\n\n# Define parameters\nparam (\n    [Parameter(Mandatory=$false)]\n    [string]$Path = "C:\\Temp"\n)\n\n# Main function\nfunction Main {\n    Write-Host "Processing your request..."\n    # Implementation would go here\n}\n\n# Execute the script\nMain\n\`\`\`\n\nThis script creates a foundation that you can customize for your specific needs.`;
    } else {
      response = `To answer your question about PowerShell: ${question}\n\nPowerShell is a task automation and configuration management framework from Microsoft, consisting of a command-line shell and associated scripting language. It's particularly powerful for system administrators and helps automate repetitive tasks.`;
    }

    return res.json({ response });
  } catch (error) {
    console.error('Error in AI agent question endpoint:', error);
    return res.status(500).json({
      message: 'Failed to process your question',
      status: 'error'
    });
  }
});


/**
 * Analyze a script using the AI assistant
 */
router.post('/analyze/assistant', async (req, res) => {
  try {
    const { content, filename, requestType = 'standard', analysisOptions } = req.body;

    if (!content) {
      return res.status(400).json({
        message: 'Script content is required',
        status: 'error'
      });
    }

    // Generate mock analysis
    const analysisResult = {
      analysis: {
        purpose: "This appears to be a PowerShell script for system administration tasks.",
        securityScore: Math.floor(Math.random() * 30) + 70, // 70-100
        codeQualityScore: Math.floor(Math.random() * 30) + 70, // 70-100
        riskScore: Math.floor(Math.random() * 20) + 10, // 10-30 (lower is better)
        suggestions: [
          "Consider adding error handling with try/catch blocks",
          "Add more detailed comments to explain complex operations",
          "Use PowerShell best practices for parameter validation"
        ],
        commandDetails: {
          "Get-Process": {
            description: "Retrieves information about processes running on the local computer",
            parameters: [
              { name: "-Name", description: "Specifies process names" },
              { name: "-Id", description: "Specifies process IDs" }
            ]
          },
          "Set-Location": {
            description: "Sets the current working location to a specified location",
            parameters: [
              { name: "-Path", description: "Specifies the path to the new location" }
            ]
          }
        },
        msDocsReferences: [
          { title: "PowerShell Documentation", url: "https://learn.microsoft.com/en-us/powershell/" },
          { title: "PowerShell Scripting", url: "https://learn.microsoft.com/en-us/powershell/scripting/" }
        ],
        examples: [],
        rawAnalysis: "Script analyzed successfully"
      },
      metadata: {
        processingTime: 0.85,
        model: "gpt-4o",
        threadId: `thread_${Date.now().toString(36)}`,
        assistantId: `asst_${Date.now().toString(36)}`,
        requestId: `req_${Date.now().toString(36)}`
      }
    };

    // Add some content-aware mock analysis
    if (content.includes('function')) {
      analysisResult.analysis.purpose = "This script defines custom functions for automating tasks.";
      analysisResult.analysis.suggestions.push("Consider documenting function parameters with comment-based help");
    }

    if (content.includes('Get-')) {
      analysisResult.analysis.purpose = "This script retrieves and processes system information.";
    }

    if (content.includes('New-')) {
      analysisResult.analysis.purpose = "This script creates new resources or configurations.";
    }

    return res.json(analysisResult);
  } catch (error) {
    console.error('Error in AI assistant analysis endpoint:', error);
    return res.status(500).json({
      message: 'Failed to analyze the script',
      status: 'error'
    });
  }
});

/**
 * Explain a PowerShell script or command
 */
router.post('/explain', async (req, res) => {
  try {
    const { content, type = 'simple' } = req.body;

    if (!content) {
      return res.status(400).json({
        message: 'Script content is required',
        status: 'error'
      });
    }

    // Generate explanation based on content
    let explanation = "This PowerShell script ";

    if (content.includes('Get-')) {
      explanation += "retrieves information from your system. ";
    }

    if (content.includes('Set-')) {
      explanation += "modifies system settings or properties. ";
    }

    if (content.includes('New-')) {
      explanation += "creates new resources or objects. ";
    }

    if (content.includes('Remove-')) {
      explanation += "removes resources or objects from your system. ";
    }

    if (content.includes('function')) {
      explanation += "defines custom functions for reusable code blocks. ";
    }

    if (content.includes('foreach') || content.includes('for ') || content.includes('while')) {
      explanation += "uses loops to iterate through collections or repeat operations. ";
    }

    if (content.includes('if ') || content.includes('else')) {
      explanation += "contains conditional logic to handle different scenarios. ";
    }

    if (content.includes('try') || content.includes('catch')) {
      explanation += "implements error handling to gracefully manage exceptions. ";
    }

    // Add more detailed explanation based on the type
    if (type === 'detailed') {
      explanation += "\n\nThe script can be broken down into these main components:\n\n";

      if (content.includes('param')) {
        explanation += "1. Parameter declaration: Defines input parameters that can be passed to the script.\n";
      }

      if (content.includes('function')) {
        explanation += "2. Function definitions: Creates reusable code blocks that can be called multiple times.\n";
      }

      explanation += `3. Main execution: The primary logic of the script that carries out its intended purpose.\n`;

      // Add example usage
      explanation += "\n\nExample usage:\n```powershell\n";
      explanation += "# Assuming this script is saved as Script.ps1\n";
      explanation += ".\\Script.ps1";

      if (content.includes('param')) {
        explanation += " -Path 'C:\\Example'";
      }

      explanation += "\n```";
    }

    // Add security considerations for security type
    if (type === 'security') {
      explanation += "\n\nSecurity considerations:\n\n";

      if (content.includes('Remove-') || content.includes('Delete')) {
        explanation += "⚠️ WARNING: This script contains commands that delete resources. Ensure you have proper backups before execution.\n";
      }

      if (content.includes('New-') || content.includes('Set-')) {
        explanation += "⚠️ CAUTION: This script modifies system state. Review changes carefully before execution.\n";
      }

      if (content.includes('Invoke-WebRequest') || content.includes('Invoke-RestMethod')) {
        explanation += "⚠️ NETWORK ACCESS: This script makes external network requests. Ensure you trust the endpoints it's connecting to.\n";
      }

      if (content.includes('Invoke-Expression') || content.includes('Invoke-Command') || content.includes('ScriptBlock')) {
        explanation += "⚠️ DYNAMIC EXECUTION: This script dynamically executes code, which could pose security risks if the input is not properly validated.\n";
      }

      explanation += "\nBest practices:\n";
      explanation += "1. Always run scripts with least privilege necessary.\n";
      explanation += "2. Use Set-ExecutionPolicy to control PowerShell script execution policy.\n";
      explanation += "3. Consider signing scripts for production environments.\n";
    }

    return res.json({ explanation });
  } catch (error) {
    console.error('Error in script explanation endpoint:', error);
    return res.status(500).json({
      message: 'Failed to explain the script',
      status: 'error'
    });
  }
});

/**
 * Get examples of similar scripts
 */
router.get('/examples', async (req, res) => {
  try {
    const { description, limit = 10 } = req.query;

    if (!description) {
      return res.status(400).json({
        message: 'Description is required',
        status: 'error'
      });
    }

    // Generate mock examples
    const examples = [];
    const titles = [
      "File System Backup Script",
      "Process Monitor and Logger",
      "Network Configuration Manager",
      "System Health Reporter",
      "User Account Management",
      "Security Compliance Checker",
      "Event Log Parser",
      "Active Directory Query Tool",
      "Scheduled Task Automation",
      "Exchange Server Management"
    ];

    const descString = description.toString().toLowerCase();

    // Prioritize examples that match the description
    const priorityTypes = [];
    if (descString.includes('file') || descString.includes('backup')) priorityTypes.push('File');
    if (descString.includes('process') || descString.includes('monitor')) priorityTypes.push('Process');
    if (descString.includes('network') || descString.includes('config')) priorityTypes.push('Network');
    if (descString.includes('user') || descString.includes('account')) priorityTypes.push('User');
    if (descString.includes('security') || descString.includes('compliance')) priorityTypes.push('Security');

    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : (typeof limit === 'number' ? limit : 10);

    for (let i = 0; i < Math.min(limitNum, titles.length); i++) {
      const titleIndex = priorityTypes.length > 0 && i < priorityTypes.length
        ? titles.findIndex(t => t.includes(priorityTypes[i]))
        : i;

      const finalIndex = titleIndex >= 0 ? titleIndex : i;

      examples.push({
        id: `ex_${Date.now().toString(36)}_${i}`,
        title: titles[finalIndex],
        snippet: `# ${titles[finalIndex]}
# This PowerShell script demonstrates ${titles[finalIndex].toLowerCase()}

param (
    [Parameter(Mandatory=$false)]
    [string]$Path = "C:\\Temp",
    [switch]$Force
)

# Main function
function Main {
    Write-Host "Starting ${titles[finalIndex]}..."
    # Script implementation would go here
}

# Execute the script
Main
`,
        downloadUrl: `#example-${i+1}`,
        rating: Math.floor(Math.random() * 5) + 1,
        complexity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)]
      });
    }

    return res.json({ examples });
  } catch (error) {
    console.error('Error in script examples endpoint:', error);
    return res.status(500).json({
      message: 'Failed to retrieve script examples',
      status: 'error'
    });
  }
});

export default router;
