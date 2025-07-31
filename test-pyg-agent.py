#!/usr/bin/env python3
"""
Test script for the Py-g agent implementation.

This script tests the Py-g agent by analyzing a sample PowerShell script
and printing the results.
"""

import os
import json
import asyncio
import sys
from typing import Dict, Any

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Import the agent factory
from ai.agents import agent_factory

# Sample PowerShell script for testing
SAMPLE_SCRIPT = """
<#
.SYNOPSIS
    Automated deployment script for web applications.
.DESCRIPTION
    This script automates the deployment of web applications to various environments.
    It handles building, testing, and deploying the application, with rollback capabilities.
.PARAMETER Environment
    The target environment (Dev, Test, Staging, Production). Default is "Dev".
.PARAMETER Version
    The version to deploy. Default is "latest".
.PARAMETER SkipTests
    Switch to skip running tests before deployment.
.PARAMETER Force
    Switch to force deployment even if validation fails.
.EXAMPLE
    .\DeployWebApp.ps1 -Environment "Production" -Version "1.2.3"
#>

param (
    [ValidateSet("Dev", "Test", "Staging", "Production")]
    [string]$Environment = "Dev",
    
    [string]$Version = "latest",
    
    [switch]$SkipTests,
    
    [switch]$Force
)

# Configuration for different environments
$Config = @{
    Dev = @{
        ServerUrl = "dev-server.example.com"
        ApiKey = "dev-api-key-12345"
        DeployPath = "/var/www/dev"
    }
    Test = @{
        ServerUrl = "test-server.example.com"
        ApiKey = "test-api-key-67890"
        DeployPath = "/var/www/test"
    }
    Staging = @{
        ServerUrl = "staging-server.example.com"
        ApiKey = "staging-api-key-abcde"
        DeployPath = "/var/www/staging"
    }
    Production = @{
        ServerUrl = "prod-server.example.com"
        ApiKey = "prod-api-key-fghij"
        DeployPath = "/var/www/production"
    }
}

# Logging function
function Write-Log {
    param (
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] [$Level] $Message"
    
    Write-Host $LogEntry
    
    # Also log to file
    $LogFile = "deployment_$Environment.log"
    Add-Content -Path $LogFile -Value $LogEntry
}

# Validate deployment prerequisites
function Test-DeploymentPrerequisites {
    Write-Log "Validating deployment prerequisites..."
    
    # Check if we have access to the target server
    try {
        $ServerUrl = $Config[$Environment].ServerUrl
        $TestConnection = Test-NetConnection -ComputerName $ServerUrl -Port 22 -InformationLevel Quiet
        
        if (-not $TestConnection) {
            Write-Log "Cannot connect to server $ServerUrl" -Level "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Error testing connection: $_" -Level "ERROR"
        return $false
    }
    
    # Check if API key is valid
    try {
        $ApiKey = $Config[$Environment].ApiKey
        $ApiUrl = "https://$ServerUrl/api/validate"
        
        $Headers = @{
            "Authorization" = "Bearer $ApiKey"
            "Content-Type" = "application/json"
        }
        
        $Response = Invoke-RestMethod -Uri $ApiUrl -Headers $Headers -Method Get
        
        if ($Response.status -ne "valid") {
            Write-Log "API key validation failed" -Level "ERROR"
            return $false
        }
    }
    catch {
        Write-Log "Error validating API key: $_" -Level "ERROR"
        return $false
    }
    
    Write-Log "All prerequisites validated successfully"
    return $true
}

# Build the application
function Build-Application {
    Write-Log "Building application version $Version..."
    
    try {
        # Run build script
        $BuildScript = "./build.ps1"
        $BuildArgs = @{
            Version = $Version
            Environment = $Environment
        }
        
        & $BuildScript @BuildArgs
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Build failed with exit code $LASTEXITCODE" -Level "ERROR"
            return $false
        }
        
        Write-Log "Build completed successfully"
        return $true
    }
    catch {
        Write-Log "Error during build: $_" -Level "ERROR"
        return $false
    }
}

# Run tests
function Test-Application {
    if ($SkipTests) {
        Write-Log "Skipping tests as requested"
        return $true
    }
    
    Write-Log "Running tests..."
    
    try {
        # Run test script
        $TestScript = "./test.ps1"
        $TestArgs = @{
            Environment = $Environment
        }
        
        & $TestScript @TestArgs
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Tests failed with exit code $LASTEXITCODE" -Level "ERROR"
            return $false
        }
        
        Write-Log "All tests passed"
        return $true
    }
    catch {
        Write-Log "Error during tests: $_" -Level "ERROR"
        return $false
    }
}

# Deploy the application
function Deploy-Application {
    Write-Log "Deploying to $Environment environment..."
    
    try {
        $ServerUrl = $Config[$Environment].ServerUrl
        $ApiKey = $Config[$Environment].ApiKey
        $DeployPath = $Config[$Environment].DeployPath
        
        # Create backup of current deployment
        $BackupCommand = "ssh admin@$ServerUrl 'cp -r $DeployPath $DeployPath.backup'"
        Invoke-Expression $BackupCommand
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Backup failed with exit code $LASTEXITCODE" -Level "ERROR"
            return $false
        }
        
        # Upload new version
        $UploadCommand = "scp -r ./dist/* admin@$ServerUrl:$DeployPath"
        Invoke-Expression $UploadCommand
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Upload failed with exit code $LASTEXITCODE" -Level "ERROR"
            # Restore from backup
            Invoke-Expression "ssh admin@$ServerUrl 'cp -r $DeployPath.backup/* $DeployPath'"
            return $false
        }
        
        # Run post-deployment script on server
        $PostDeployCommand = "ssh admin@$ServerUrl 'cd $DeployPath && ./post-deploy.sh'"
        Invoke-Expression $PostDeployCommand
        
        if ($LASTEXITCODE -ne 0) {
            Write-Log "Post-deployment script failed with exit code $LASTEXITCODE" -Level "ERROR"
            # Restore from backup
            Invoke-Expression "ssh admin@$ServerUrl 'cp -r $DeployPath.backup/* $DeployPath'"
            return $false
        }
        
        Write-Log "Deployment completed successfully"
        return $true
    }
    catch {
        Write-Log "Error during deployment: $_" -Level "ERROR"
        # Attempt to restore from backup
        try {
            Invoke-Expression "ssh admin@$ServerUrl 'cp -r $DeployPath.backup/* $DeployPath'"
            Write-Log "Restored from backup after deployment failure" -Level "WARN"
        }
        catch {
            Write-Log "Failed to restore from backup: $_" -Level "ERROR"
        }
        return $false
    }
}

# Main deployment workflow
function Start-Deployment {
    Write-Log "Starting deployment workflow for $Environment environment, version $Version"
    
    # Validate prerequisites
    $PrerequisitesValid = Test-DeploymentPrerequisites
    if (-not $PrerequisitesValid -and -not $Force) {
        Write-Log "Deployment prerequisites not met. Use -Force to deploy anyway." -Level "ERROR"
        return $false
    }
    
    # Build the application
    $BuildSuccessful = Build-Application
    if (-not $BuildSuccessful) {
        Write-Log "Build failed. Aborting deployment." -Level "ERROR"
        return $false
    }
    
    # Run tests
    $TestsSuccessful = Test-Application
    if (-not $TestsSuccessful -and -not $Force) {
        Write-Log "Tests failed. Use -Force to deploy anyway." -Level "ERROR"
        return $false
    }
    
    # Deploy the application
    $DeploySuccessful = Deploy-Application
    if (-not $DeploySuccessful) {
        Write-Log "Deployment failed." -Level "ERROR"
        return $false
    }
    
    Write-Log "Deployment workflow completed successfully"
    return $true
}

# Execute the deployment workflow
try {
    $Result = Start-Deployment
    
    if ($Result) {
        Write-Log "Deployment of version $Version to $Environment environment was successful" -Level "SUCCESS"
        exit 0
    }
    else {
        Write-Log "Deployment of version $Version to $Environment environment failed" -Level "ERROR"
        exit 1
    }
}
catch {
    Write-Log "Unhandled exception during deployment: $_" -Level "ERROR"
    exit 1
}
"""

async def test_pyg_agent():
    """Test the Py-g agent."""
    print("Testing Py-g agent...")
    
    # Get the API key from the environment
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        return
    
    # Get the Py-g agent
    agent = agent_factory.get_agent("pyg", api_key)
    
    # Analyze the sample script
    print("Analyzing sample PowerShell script...")
    analysis = await agent.analyze_script(
        "test-script", 
        SAMPLE_SCRIPT,
        include_command_details=True,
        fetch_ms_docs=True
    )
    
    # Print the analysis results
    print("\nAnalysis Results:")
    print(f"Purpose: {analysis.get('purpose', 'Unknown')}")
    print(f"Security Score: {analysis.get('security_score', 0)}/10")
    print(f"Code Quality Score: {analysis.get('code_quality_score', 0)}/10")
    print(f"Risk Score: {analysis.get('risk_score', 0)}/10")
    print(f"Category: {analysis.get('category', 'Unknown')}")
    
    print("\nSecurity Analysis:")
    for issue in analysis.get('security_analysis', []):
        print(f"- {issue}")
    
    print("\nOptimization Suggestions:")
    for suggestion in analysis.get('optimization', []):
        print(f"- {suggestion}")
    
    if 'ms_docs_references' in analysis:
        print("\nMS Docs References:")
        for ref in analysis.get('ms_docs_references', [])[:5]:  # Show first 5 references
            print(f"- {ref.get('command', 'Unknown')}: {ref.get('url', 'No URL')}")
    
    # Test declarative workflow capabilities
    print("\nTesting declarative workflow capabilities...")
    messages = [
        {"role": "user", "content": "Can you analyze this deployment script and suggest improvements for security and error handling?"}
    ]
    
    response = await agent.process_message(messages)
    print(f"\nWorkflow Response:\n{response}")
    
    # Test multi-step planning
    print("\nTesting multi-step planning capabilities...")
    planning_messages = [
        {"role": "user", "content": "Create a plan to refactor this script to use more modern PowerShell practices and improve security."}
    ]
    
    planning_response = await agent.process_message(planning_messages)
    print(f"\nPlanning Response:\n{planning_response}")

if __name__ == "__main__":
    asyncio.run(test_pyg_agent())
