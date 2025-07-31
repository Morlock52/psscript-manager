# Unique PowerShell script for testing upload functionality
# Author: Claude
# Version: 1.0
# Date: 2025-03-09

function Get-DiskInfo {
    <#
    .SYNOPSIS
        Gets detailed disk information.

    .DESCRIPTION
        This function retrieves detailed disk information including
        disk size, free space, and health status.

    .EXAMPLE
        Get-DiskInfo

        Returns disk information for the local computer.
    #>

    [CmdletBinding()]
    param()

    process {
        try {
            # Get physical disk information
            $physicalDisks = Get-PhysicalDisk | Select-Object DeviceId, 
                                                            FriendlyName, 
                                                            MediaType, 
                                                            OperationalStatus, 
                                                            HealthStatus, 
                                                            Size

            # Get logical disk information
            $logicalDisks = Get-Volume | Select-Object DriveLetter, 
                                                     FileSystemLabel, 
                                                     FileSystem, 
                                                     DriveType, 
                                                     HealthStatus, 
                                                     SizeRemaining, 
                                                     Size

            # Calculate disk usage
            $diskUsage = $logicalDisks | ForEach-Object {
                if ($_.Size -gt 0) {
                    $percentFree = [math]::Round(($_.SizeRemaining / $_.Size) * 100, 2)
                    $percentUsed = 100 - $percentFree
                    
                    [PSCustomObject]@{
                        DriveLetter = $_.DriveLetter
                        Label = $_.FileSystemLabel
                        TotalSizeGB = [math]::Round($_.Size / 1GB, 2)
                        FreeSpaceGB = [math]::Round($_.SizeRemaining / 1GB, 2)
                        UsedSpaceGB = [math]::Round(($_.Size - $_.SizeRemaining) / 1GB, 2)
                        PercentFree = $percentFree
                        PercentUsed = $percentUsed
                    }
                }
            }

            # Return custom object with all information
            [PSCustomObject]@{
                ComputerName = $env:COMPUTERNAME
                PhysicalDisks = $physicalDisks
                LogicalDisks = $logicalDisks
                DiskUsage = $diskUsage
                ReportTime = Get-Date
            }
        }
        catch {
            Write-Error "Failed to get disk information. Error: $_"
        }
    }
}

# Example usage
Get-DiskInfo | Format-List
