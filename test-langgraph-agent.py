#!/usr/bin/env python3
"""
Test script for the LangGraph agent implementation.

This script tests the LangGraph agent by analyzing a sample PowerShell script
and printing the results.
"""

import os
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
    System health check script that monitors CPU, memory, disk, and network.
.DESCRIPTION
    This script collects system performance metrics and logs them to a file.
    It can also send alerts if thresholds are exceeded.
.PARAMETER LogPath
    Path to the log file. Default is "C:\\Logs\\SystemHealth.log".
.PARAMETER AlertThreshold
    CPU percentage threshold for alerts. Default is 90.
.PARAMETER Interval
    Monitoring interval in seconds. Default is 60.
.EXAMPLE
    .\SystemHealthCheck.ps1 -LogPath "D:\\Logs\\Health.log" -AlertThreshold 80 -Interval 30
#>

param (
    [string]$LogPath = "C:\\Logs\\SystemHealth.log",
    [int]$AlertThreshold = 90,
    [int]$Interval = 60
)

# Create log directory if it doesn't exist
$LogDir = Split-Path -Path $LogPath -Parent
if (-not (Test-Path -Path $LogDir)) {
    New-Item -Path $LogDir -ItemType Directory -Force | Out-Null
}

function Get-CPUUsage {
    $CPUUsage = (Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue
    return [math]::Round($CPUUsage, 2)
}

function Get-MemoryUsage {
    $OS = Get-WmiObject -Class Win32_OperatingSystem
    $MemoryUsage = ((($OS.TotalVisibleMemorySize - $OS.FreePhysicalMemory) / $OS.TotalVisibleMemorySize) * 100)
    return [math]::Round($MemoryUsage, 2)
}

function Get-DiskUsage {
    $Disks = Get-WmiObject -Class Win32_LogicalDisk -Filter "DriveType=3"
    $DiskUsage = @()
    
    foreach ($Disk in $Disks) {
        $PercentUsed = [math]::Round(($Disk.Size - $Disk.FreeSpace) / $Disk.Size * 100, 2)
        $DiskUsage += [PSCustomObject]@{
            Drive = $Disk.DeviceID
            PercentUsed = $PercentUsed
        }
    }
    
    return $DiskUsage
}

function Get-NetworkUsage {
    $NetworkAdapters = Get-WmiObject -Class Win32_PerfFormattedData_Tcpip_NetworkInterface
    $NetworkUsage = @()
    
    foreach ($Adapter in $NetworkAdapters) {
        $NetworkUsage += [PSCustomObject]@{
            Name = $Adapter.Name
            BytesSent = $Adapter.BytesSentPersec
            BytesReceived = $Adapter.BytesReceivedPersec
        }
    }
    
    return $NetworkUsage
}

function Write-HealthLog {
    param (
        [string]$Message
    )
    
    $Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$Timestamp] $Message"
    
    Add-Content -Path $LogPath -Value $LogEntry
    Write-Host $LogEntry
}

function Send-Alert {
    param (
        [string]$Message
    )
    
    # In a real script, this would send an email or other notification
    Write-HealthLog "ALERT: $Message"
}

# Main monitoring loop
Write-HealthLog "System health monitoring started. Press Ctrl+C to stop."

try {
    while ($true) {
        # Get system metrics
        $CPU = Get-CPUUsage
        $Memory = Get-MemoryUsage
        $Disks = Get-DiskUsage
        $Network = Get-NetworkUsage
        
        # Log system health
        Write-HealthLog "CPU Usage: $CPU%"
        Write-HealthLog "Memory Usage: $Memory%"
        
        foreach ($Disk in $Disks) {
            Write-HealthLog "Disk $($Disk.Drive) Usage: $($Disk.PercentUsed)%"
        }
        
        foreach ($Adapter in $Network) {
            Write-HealthLog "Network $($Adapter.Name): Sent $($Adapter.BytesSent) bytes, Received $($Adapter.BytesReceived) bytes"
        }
        
        # Check for alerts
        if ($CPU -gt $AlertThreshold) {
            Send-Alert "CPU usage is $CPU%, which exceeds the threshold of $AlertThreshold%"
        }
        
        if ($Memory -gt $AlertThreshold) {
            Send-Alert "Memory usage is $Memory%, which exceeds the threshold of $AlertThreshold%"
        }
        
        foreach ($Disk in $Disks) {
            if ($Disk.PercentUsed -gt $AlertThreshold) {
                Send-Alert "Disk $($Disk.Drive) usage is $($Disk.PercentUsed)%, which exceeds the threshold of $AlertThreshold%"
            }
        }
        
        # Wait for the next interval
        Start-Sleep -Seconds $Interval
    }
}
catch {
    Write-HealthLog "Error: $_"
}
finally {
    Write-HealthLog "System health monitoring stopped."
}
"""

async def test_langgraph_agent():
    """Test the LangGraph agent."""
    print("Testing LangGraph agent...")
    
    # Get the API key from the environment
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("Error: OPENAI_API_KEY environment variable not set")
        return
    
    # Get the LangGraph agent
    agent = agent_factory.get_agent("langgraph", api_key)
    
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
    
    # Test chat functionality
    print("\nTesting chat functionality...")
    messages = [
        {"role": "user", "content": "Can you explain how the Get-CPUUsage function works in this script?"}
    ]
    
    response = await agent.process_message(messages)
    print(f"\nChat Response:\n{response}")

async def test_pyg_agent():
    """Test the Py-g agent."""
    print("\nTesting Py-g agent...")
    
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
    
    # Test chat functionality
    print("\nTesting chat functionality...")
    messages = [
        {"role": "user", "content": "What are the parameters of this script and what do they do?"}
    ]
    
    response = await agent.process_message(messages)
    print(f"\nChat Response:\n{response}")

async def main():
    """Main function."""
    # Test both agent implementations
    await test_langgraph_agent()
    await test_pyg_agent()

if __name__ == "__main__":
    asyncio.run(main())
