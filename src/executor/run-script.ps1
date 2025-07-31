#Requires -Version 5.1
<#
.SYNOPSIS
  Executes a given PowerShell script with parameters and timeout, capturing output.
.DESCRIPTION
  This script is designed to be called by the Node.js executor server.
  It takes the path to a user-provided script, optional parameters, and a timeout value.
  It executes the script, captures STDOUT and STDERR, handles timeouts, and exits with the script's exit code.
.PARAMETER ScriptPath
  The full path to the PowerShell script to execute.
.PARAMETER ScriptParameters
  A string containing the parameters to pass to the target script (e.g., "-Param1 'Value1' -Param2 123").
.PARAMETER TimeoutSeconds
  The maximum execution time in seconds before the script is terminated.
.NOTES
  This script should be executed with -ExecutionPolicy Bypass.
  It redirects STDERR to STDOUT for capture, but also writes errors to the host for logging.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$ScriptPath,

    [Parameter(Mandatory=$false)]
    [string]$ScriptParameters = '',

    [Parameter(Mandatory=$true)]
    [int]$TimeoutSeconds
)

# --- Configuration ---
$ErrorActionPreference = 'Continue' # Allow script to continue on non-terminating errors to capture them
$WarningPreference = 'Continue'
$VerbosePreference = 'Continue'
$DebugPreference = 'Continue'

# --- Helper Functions ---
function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    Write-Host "[$([DateTime]::UtcNow.ToString('yyyy-MM-dd HH:mm:ss'))] [$Level] [Executor] $Message"
}

# --- Main Logic ---
Write-Log "Starting execution of '$ScriptPath'"
Write-Log "Parameters: '$ScriptParameters'"
Write-Log "Timeout: $TimeoutSeconds seconds"

if (-not (Test-Path -Path $ScriptPath -PathType Leaf)) {
    Write-Log "Script file not found at '$ScriptPath'" -Level 'ERROR'
    exit 99 # Use a specific exit code for executor errors
}

# Prepare the command to execute the target script
# We use Invoke-Command to run in a separate process scope and handle parameters
$command = {
    param($targetScript, $paramsString)

    # Parse parameters if they're provided as JSON
    $scriptParams = @{}
    if ($paramsString -and $paramsString.Trim()) {
        try {
            # Try to parse as JSON first (secure method)
            $parsedParams = $paramsString | ConvertFrom-Json
            if ($parsedParams -is [PSCustomObject]) {
                $parsedParams.PSObject.Properties | ForEach-Object {
                    $scriptParams[$_.Name] = $_.Value
                }
            }
        }
        catch {
            # Fall back to legacy parameter string format for backward compatibility
            # This should be avoided in production
            Write-Warning "Failed to parse parameters as JSON, using legacy format"
            $execCommand = "& `"$targetScript`" $paramsString"
            Write-Verbose "Executing command: $execCommand"
            Invoke-Expression -Command $execCommand -ErrorAction Stop
            return
        }
    }

    try {
        # Execute the script with splatting (secure method)
        if ($scriptParams.Count -gt 0) {
            & $targetScript @scriptParams
        } else {
            & $targetScript
        }
    }
    catch {
        # Write the error to stderr stream for capture
        Write-Error $_
        # Exit with a non-zero code if the script failed
        exit 1
    }
}

# Start the job with timeout handling
$job = Start-Job -ScriptBlock $command -ArgumentList $ScriptPath, $ScriptParameters
Write-Log "Started job $($job.Id) for script '$ScriptPath'"

$jobCompleted = $job | Wait-Job -Timeout $TimeoutSeconds

if ($jobCompleted) {
    Write-Log "Job $($job.Id) completed within timeout."
    # Receive job output (includes STDOUT and STDERR because of redirection in the job script block)
    $output = $job | Receive-Job
    Write-Host $output # Write combined output to STDOUT for capture by Node.js

    # Determine the exit code based on job state
    $exitCode = if ($job.State -eq [System.Management.Automation.JobState]::Failed) {
        # Attempt to get the actual exit code if possible, otherwise default to 1
        # Note: Getting precise exit code from Start-Job can be tricky
        1 
    } else {
        0
    }
    Write-Log "Job finished with state $($job.State) and inferred exit code $exitCode"
}
else {
    Write-Log "Job $($job.Id) timed out after $TimeoutSeconds seconds." -Level 'ERROR'
    Stop-Job -Job $job
    # Write timeout message to STDOUT for capture
    Write-Host "EXECUTION TIMEOUT: Script exceeded the maximum execution time of $TimeoutSeconds seconds."
    $exitCode = 124 # Standard exit code for timeout
}

# Clean up the job object
Remove-Job -Job $job -Force

Write-Log "Execution finished. Exiting with code $exitCode."
exit $exitCode
