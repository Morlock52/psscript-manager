# New PowerShell script for testing upload functionality
# Author: Claude
# Version: 1.0
# Date: 2025-03-09

function Get-NetworkInfo {
    <#
    .SYNOPSIS
        Gets basic network information.
    
    .DESCRIPTION
        This function retrieves basic network information including adapter details,
        IP configuration, and connectivity status.
    
    .EXAMPLE
        Get-NetworkInfo
        
        Returns network information for the local computer.
    #>
    
    [CmdletBinding()]
    param()
    
    process {
        try {
            # Get network adapter information
            $NetworkAdapters = Get-NetAdapter | Where-Object { $_.Status -eq "Up" }
            
            # Get IP configuration
            $IPConfig = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq "Up" }
            
            # Get DNS client server addresses
            $DNSServers = Get-DnsClientServerAddress | Where-Object { $_.InterfaceAlias -in $NetworkAdapters.InterfaceAlias }
            
            # Test internet connectivity
            $InternetConnectivity = Test-Connection -ComputerName 8.8.8.8 -Count 1 -Quiet
            
            # Return custom object with all information
            [PSCustomObject]@{
                ComputerName = $env:COMPUTERNAME
                ActiveAdapters = $NetworkAdapters | Select-Object Name, InterfaceDescription, Status, LinkSpeed, MacAddress
                IPConfiguration = $IPConfig | Select-Object InterfaceAlias, IPv4Address, IPv4DefaultGateway
                DNSServers = $DNSServers | Select-Object InterfaceAlias, ServerAddresses
                InternetConnectivity = $InternetConnectivity
                ReportTime = Get-Date
            }
        }
        catch {
            Write-Error "Failed to get network information. Error: $_"
        }
    }
}

# Example usage
Get-NetworkInfo | Format-List
