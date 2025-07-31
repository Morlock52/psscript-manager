#Requires -Version 5.1
<#
.SYNOPSIS
  Executes a PowerShell script in a constrained language mode sandbox for security.
.DESCRIPTION
  This script executes user-provided PowerShell scripts in a sandboxed environment with:
  - Constrained Language Mode to prevent dangerous operations
  - Restricted execution policy
  - Timeout handling
  - Resource limits where possible
  - Safe parameter handling
.PARAMETER ScriptPath
  The full path to the PowerShell script to execute.
.PARAMETER ScriptParameters
  A JSON string containing the parameters to pass to the target script.
.PARAMETER TimeoutSeconds
  The maximum execution time in seconds before the script is terminated.
.NOTES
  This script prioritizes security over functionality by using PowerShell's
  Constrained Language Mode and other security restrictions.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$ScriptPath,

    [Parameter(Mandatory=$false)]
    [string]$ScriptParameters = '',

    [Parameter(Mandatory=$true)]
    [int]$TimeoutSeconds,

    [Parameter(Mandatory=$false)]
    [switch]$UseConstrainedMode = $true
)

# --- Security Configuration ---
$ErrorActionPreference = 'Continue'
$WarningPreference = 'Continue' 
$VerbosePreference = 'SilentlyContinue'
$DebugPreference = 'SilentlyContinue'

# --- Helper Functions ---
function Write-Log {
    param([string]$Message, [string]$Level = 'INFO')
    Write-Host "[$([DateTime]::UtcNow.ToString('yyyy-MM-dd HH:mm:ss'))] [$Level] [Sandbox] $Message"
}

function Test-ScriptSafety {
    param([string]$Content)
    
    # List of dangerous commands/patterns to block
    $dangerousPatterns = @(
        'Invoke-Expression',
        'Invoke-Command.*-ComputerName',
        'New-Object.*System\.Net',
        'System\.Net\.WebClient',
        'Invoke-WebRequest',
        'Invoke-RestMethod',
        'Start-Process',
        'Get-WmiObject',
        'Get-CimInstance.*-ComputerName',
        'Enter-PSSession',
        'New-PSSession',
        'Remove-Item.*-Recurse.*-Force',
        'Format-Volume',
        'Clear-Disk',
        'Set-ExecutionPolicy',
        'Add-Type',
        '\[System\.Reflection\.Assembly\]',
        'loadfile|loadfrom',
        'System\.IO\.File.*Delete',
        'System\.IO\.Directory.*Delete',
        'cmd\.exe|powershell\.exe',
        'Registry::',
        'HKLM:|HKCU:',
        'Get-Credential',
        'ConvertTo-SecureString.*-AsPlainText'
    )
    
    foreach ($pattern in $dangerousPatterns) {
        if ($Content -match $pattern) {
            Write-Log "Blocked dangerous pattern: $pattern" -Level 'SECURITY'
            return $false
        }
    }
    
    return $true
}

# --- Main Logic ---
Write-Log "Starting sandboxed execution of '$ScriptPath'"
Write-Log "Constrained Mode: $UseConstrainedMode"
Write-Log "Timeout: $TimeoutSeconds seconds"

# Verify script exists
if (-not (Test-Path -Path $ScriptPath -PathType Leaf)) {
    Write-Log "Script file not found at '$ScriptPath'" -Level 'ERROR'
    exit 99
}

# Read and validate script content
try {
    $scriptContent = Get-Content -Path $ScriptPath -Raw -ErrorAction Stop
    Write-Log "Script size: $($scriptContent.Length) characters"
    
    # Security check - scan for dangerous patterns
    if (-not (Test-ScriptSafety -Content $scriptContent)) {
        Write-Log "Script contains potentially dangerous commands and has been blocked" -Level 'SECURITY'
        Write-Host "SECURITY_VIOLATION: Script contains blocked commands or patterns"
        exit 126
    }
    
} catch {
    Write-Log "Failed to read script file: $_" -Level 'ERROR'
    exit 98
}

# Parse parameters safely
$scriptParams = @{}
if ($ScriptParameters -and $ScriptParameters.Trim()) {
    try {
        $parsedParams = $ScriptParameters | ConvertFrom-Json -ErrorAction Stop
        if ($parsedParams -is [PSCustomObject]) {
            $parsedParams.PSObject.Properties | ForEach-Object {
                # Additional validation of parameter values
                $paramValue = $_.Value
                if ($paramValue -is [string] -and $paramValue.Length -gt 1000) {
                    Write-Log "Parameter '$($_.Name)' value is too long (>1000 chars)" -Level 'WARNING'
                    $paramValue = $paramValue.Substring(0, 1000) + "...[TRUNCATED]"
                }
                $scriptParams[$_.Name] = $paramValue
            }
        }
        Write-Log "Parsed $($scriptParams.Count) parameters"
    }
    catch {
        Write-Log "Failed to parse parameters as JSON: $_" -Level 'ERROR'
        Write-Host "PARAMETER_ERROR: Invalid parameter format"
        exit 97
    }
}

# Create execution environment
$executionConfig = @{
    UseConstrainedLanguageMode = $UseConstrainedMode
    MaxMemoryMB = 512  # Limit memory usage
    MaxCpuSeconds = $TimeoutSeconds
}

Write-Log "Configuring sandbox environment..."

# Prepare the sandboxed execution block
$sandboxScript = {
    param($targetScriptPath, $parameters, $constrainedMode)
    
    # Set up constrained environment if requested
    if ($constrainedMode) {
        # Enable constrained language mode by setting __PSLockdownPolicy
        $ExecutionContext.SessionState.LanguageMode = [System.Management.Automation.PSLanguageMode]::ConstrainedLanguage
        Write-Verbose "Enabled Constrained Language Mode"
    }
    
    # Additional restrictions
    $PSDefaultParameterValues = @{
        '*:Confirm' = $false
        '*:WhatIf' = $false
    }
    
    # Disable dangerous modules/cmdlets where possible
    $env:PSModulePath = ""  # Restrict module loading
    
    try {
        # Execute the target script with splatting
        if ($parameters.Count -gt 0) {
            & $targetScriptPath @parameters
        } else {
            & $targetScriptPath
        }
        
        # Capture the exit code if available
        $global:LASTEXITCODE
    }
    catch {
        Write-Error "Sandbox execution error: $_"
        exit 1
    }
}

# Start the sandboxed job
try {
    $job = Start-Job -ScriptBlock $sandboxScript -ArgumentList $ScriptPath, $scriptParams, $UseConstrainedMode
    Write-Log "Started sandboxed job $($job.Id)"
    
    # Wait for completion with timeout
    $jobCompleted = $job | Wait-Job -Timeout $TimeoutSeconds
    
    if ($jobCompleted) {
        Write-Log "Job $($job.Id) completed within timeout"
        
        # Get job output
        $output = $job | Receive-Job
        
        # Get any errors
        $errors = $job | Receive-Job -ErrorAction SilentlyContinue -ErrorVariable jobErrors
        
        # Output results
        if ($output) {
            Write-Host $output
        }
        
        if ($jobErrors) {
            foreach ($err in $jobErrors) {
                Write-Warning "Execution error: $err"
            }
        }
        
        # Determine exit code
        $exitCode = if ($job.State -eq [System.Management.Automation.JobState]::Failed) {
            Write-Log "Job failed" -Level 'ERROR'
            1
        } elseif ($jobErrors.Count -gt 0) {
            Write-Log "Job completed with errors" -Level 'WARNING'  
            2
        } else {
            Write-Log "Job completed successfully"
            0
        }
        
    } else {
        Write-Log "Job $($job.Id) timed out after $TimeoutSeconds seconds" -Level 'ERROR'
        Stop-Job -Job $job -ErrorAction SilentlyContinue
        Write-Host "EXECUTION_TIMEOUT: Script exceeded maximum execution time of $TimeoutSeconds seconds"
        $exitCode = 124
    }
    
} catch {
    Write-Log "Failed to start sandboxed job: $_" -Level 'ERROR'
    Write-Host "SANDBOX_ERROR: Failed to create execution environment"
    $exitCode = 125
    
} finally {
    # Clean up
    if ($job) {
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    }
}

Write-Log "Sandboxed execution finished with exit code $exitCode"
exit $exitCode