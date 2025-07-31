const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const port = process.env.EXECUTOR_API_PORT || 5001;
const apiKey = process.env.EXECUTOR_API_KEY || ''; // API key for basic auth

// Middleware
app.use(helmet()); // Basic security headers
app.use(express.json({ limit: '50mb' })); // Allow large script content
app.use(morgan('tiny')); // Request logging

// Simple API Key Authentication Middleware
const authenticate = (req, res, next) => {
  if (!apiKey) {
    // No API key configured, skip auth
    return next();
  }
  const providedKey = req.headers['x-executor-token'];
  if (!providedKey || providedKey !== apiKey) {
    console.warn('Authentication failed: Invalid or missing API key');
    return res.status(401).json({ status: 'failed', error: 'Unauthorized' });
  }
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Execute endpoint
app.post('/execute', authenticate, async (req, res) => {
  const { scriptContent, parameters, timeoutSeconds = 60 } = req.body;
  const executionId = crypto.randomBytes(8).toString('hex'); // Unique ID for this execution run

  if (!scriptContent) {
    return res.status(400).json({ status: 'failed', error: 'scriptContent is required' });
  }

  // Create a temporary directory for this execution
  const tempDir = path.join('/tmp', `ps_exec_${executionId}`);
  const tempScriptPath = path.join(tempDir, 'script.ps1');

  try {
    // Create temp directory
    await fs.promises.mkdir(tempDir, { recursive: true });
    console.log(`[${executionId}] Created temp directory: ${tempDir}`);

    // Write script content to a temporary file
    await fs.promises.writeFile(tempScriptPath, scriptContent, 'utf8');
    console.log(`[${executionId}] Wrote script to temporary file: ${tempScriptPath}`);

    // Use sandboxed runner for security
    const useSandbox = process.env.USE_POWERSHELL_SANDBOX !== 'false'; // Default to true
    const runnerScript = useSandbox ? 'run-script-sandbox.ps1' : 'run-script.ps1';
    
    // Prepare arguments for the runner script
    const args = [
      '-ExecutionPolicy', 'Bypass', // Required to run our runner script
      '-File', path.resolve(__dirname, runnerScript), // Path to the runner script
      '-ScriptPath', tempScriptPath, // Path to the user script
      '-TimeoutSeconds', String(timeoutSeconds) // Timeout for the user script
    ];
    
    // Add sandbox-specific options
    if (useSandbox) {
      args.push('-UseConstrainedMode', 'true');
    }

    // Add script parameters if provided - using secure parameter passing
    if (parameters && typeof parameters === 'object') {
      // Validate parameter names to prevent injection
      const validParamName = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      const safeParams = {};
      
      for (const [key, value] of Object.entries(parameters)) {
        if (!validParamName.test(key)) {
          console.error(`[${executionId}] Invalid parameter name: ${key}`);
          return res.status(400).json({
            status: 'failed',
            error: `Invalid parameter name: ${key}. Parameter names must contain only letters, numbers, and underscores.`
          });
        }
        // Store parameters safely without shell interpretation
        safeParams[key] = String(value);
      }
      
      // Pass parameters as JSON to avoid shell interpretation
      if (Object.keys(safeParams).length > 0) {
        args.push('-ScriptParameters', JSON.stringify(safeParams));
      }
    }

    console.log(`[${executionId}] Executing PowerShell with args: ${args.join(' ')}`);
    const startTime = process.hrtime();

    // Spawn PowerShell process
    const ps = spawn('pwsh', args, {
      stdio: ['ignore', 'pipe', 'pipe'], // Ignore stdin, pipe stdout/stderr
      shell: false, // More secure
      // Consider running as 'node' user if permissions allow
      // uid: 1001, 
      // gid: 1001 
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let processError = null;

    // Set execution timeout
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      console.error(`[${executionId}] Execution timed out after ${timeoutSeconds} seconds. Killing process.`);
      ps.kill('SIGKILL'); // Force kill on timeout
    }, timeoutSeconds * 1000);

    ps.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ps.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ps.on('error', (err) => {
      console.error(`[${executionId}] Failed to start PowerShell process:`, err);
      processError = err;
      clearTimeout(timeoutHandle); // Clear timeout if process fails to start
    });

    ps.on('close', (code) => {
      clearTimeout(timeoutHandle); // Clear timeout on normal exit
      const endTime = process.hrtime(startTime);
      const executionTimeSeconds = endTime[0] + endTime[1] / 1e9;

      console.log(`[${executionId}] PowerShell process closed with code ${code}. Time: ${executionTimeSeconds.toFixed(3)}s`);

      // Clean up temporary directory asynchronously
      fs.promises.rm(tempDir, { recursive: true, force: true })
        .then(() => console.log(`[${executionId}] Cleaned up temp directory: ${tempDir}`))
        .catch(err => console.error(`[${executionId}] Error cleaning up temp directory ${tempDir}:`, err));

      if (processError) {
        return res.status(500).json({
          status: 'failed',
          error: `Failed to start PowerShell process: ${processError.message}`
        });
      }

      if (timedOut) {
        return res.status(408).json({ // Request Timeout
          status: 'failed',
          error: `Execution timed out after ${timeoutSeconds} seconds`,
          stdout: stdout.slice(-1024), // Include last 1KB of stdout
          stderr: stderr.slice(-1024), // Include last 1KB of stderr
          executionTimeSeconds: timeoutSeconds
        });
      }

      if (code === 0) {
        res.status(200).json({
          status: 'success',
          exitCode: code,
          stdout: stdout,
          stderr: stderr,
          executionTimeSeconds: parseFloat(executionTimeSeconds.toFixed(3))
        });
      } else {
        // Treat non-zero exit code as a script error, but successful execution
        res.status(200).json({
          status: 'error',
          exitCode: code,
          stdout: stdout,
          stderr: stderr,
          executionTimeSeconds: parseFloat(executionTimeSeconds.toFixed(3))
        });
      }
    });

  } catch (error) {
    console.error(`[${executionId}] Unexpected error in /execute endpoint:`, error);
    // Clean up temp dir if created before error
    if (fs.existsSync(tempDir)) {
      fs.promises.rm(tempDir, { recursive: true, force: true })
        .catch(err => console.error(`[${executionId}] Error cleaning up temp directory after error:`, err));
    }
    res.status(500).json({
      status: 'failed',
      error: `Internal server error: ${error.message}`
    });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`PowerShell Executor API server listening on port ${port}`);
  if (apiKey) {
    console.log('API Key authentication is enabled.');
  } else {
    console.warn('Warning: API Key authentication is disabled. Set EXECUTOR_API_KEY environment variable to enable.');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0); // Simple exit for now
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  process.exit(0); // Simple exit for now
});
