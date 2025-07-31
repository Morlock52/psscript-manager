# PSScript Test Script (Modified Version)
# This script demonstrates various PowerShell features for testing the PSScript platform
# This is a modified version to test versioning functionality

<#
.SYNOPSIS
A test script for PSScript platform testing.

.DESCRIPTION
This script includes various PowerShell features and patterns to test the analysis capabilities
of the PSScript platform. It includes parameters, error handling, and common PowerShell commands.
This version has been modified to test the versioning functionality.

.PARAMETER InputFile
Path to an input file to process.

.PARAMETER OutputFolder
Path to the folder where output will be saved.

.PARAMETER Force
Switch to force overwrite of existing files.

.PARAMETER LogLevel
The logging level (Verbose, Information, Warning, Error).

.EXAMPLE
.\test-script.ps1 -InputFile "data.csv" -OutputFolder "C:\Output" -LogLevel "Verbose"

.NOTES
Created for PSScript platform testing.
Modified for version testing.
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$InputFile,
    
    [Parameter(Mandatory = $false, Position = 1)]
    [string]$OutputFolder = ".\output",
    
    [Parameter(Mandatory = $false)]
    [switch]$Force,
    
    [Parameter(Mandatory = $false)]
    [ValidateSet("Verbose", "Information", "Warning", "Error")]
    [string]$LogLevel = "Information"
)

# Error handling setup
$ErrorActionPreference = "Stop"

# Set logging level
switch ($LogLevel) {
    "Verbose" {
        $VerbosePreference = "Continue"
        $InformationPreference = "Continue"
        $WarningPreference = "Continue"
    }
    "Information" {
        $VerbosePreference = "SilentlyContinue"
        $InformationPreference = "Continue"
        $WarningPreference = "Continue"
    }
    "Warning" {
        $VerbosePreference = "SilentlyContinue"
        $InformationPreference = "SilentlyContinue"
        $WarningPreference = "Continue"
    }
    "Error" {
        $VerbosePreference = "SilentlyContinue"
        $InformationPreference = "SilentlyContinue"
        $WarningPreference = "SilentlyContinue"
    }
}

# Function to validate input file
function Test-InputFile {
    param (
        [string]$FilePath
    )
    
    if (-not (Test-Path -Path $FilePath -PathType Leaf)) {
        throw "Input file not found: $FilePath"
    }
    
    $extension = [System.IO.Path]::GetExtension($FilePath)
    if ($extension -ne ".csv" -and $extension -ne ".txt" -and $extension -ne ".json") {
        Write-Warning "File extension $extension may not be supported. Continuing anyway."
    }
    
    return $true
}

# Function to ensure output folder exists
function Initialize-OutputFolder {
    param (
        [string]$FolderPath,
        [bool]$ForceCreate = $false
    )
    
    if (Test-Path -Path $FolderPath -PathType Container) {
        Write-Verbose "Output folder exists: $FolderPath"
        
        if ($ForceCreate) {
            Write-Verbose "Force flag specified. Clearing existing folder."
            Remove-Item -Path "$FolderPath\*" -Force -Recurse -ErrorAction SilentlyContinue
        }
    }
    else {
        Write-Verbose "Creating output folder: $FolderPath"
        New-Item -Path $FolderPath -ItemType Directory -Force | Out-Null
    }
}

# Function to process the input file
function Process-InputFile {
    param (
        [string]$InputPath,
        [string]$OutputPath
    )
    
    try {
        Write-Verbose "Reading input file: $InputPath"
        
        # Handle different file types
        $extension = [System.IO.Path]::GetExtension($InputPath)
        $data = $null
        
        switch ($extension) {
            ".csv" {
                $data = Import-Csv -Path $InputPath
            }
            ".json" {
                $data = Get-Content -Path $InputPath | ConvertFrom-Json
            }
            default {
                $data = Get-Content -Path $InputPath | ForEach-Object {
                    [PSCustomObject]@{
                        Value = $_
                    }
                }
            }
        }
        
        # Process each row
        $results = @()
        foreach ($row in $data) {
            # Enhanced transformation - convert to uppercase and add timestamp
            $value = if ($row.PSObject.Properties.Name -contains "Value") { $row.Value } else { $row.ToString() }
            
            $transformedRow = [PSCustomObject]@{
                OriginalValue = $value
                TransformedValue = $value.ToUpper()
                ProcessedDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
                ProcessedBy = $env:USERNAME
                ComputerName = $env:COMPUTERNAME
            }
            
            $results += $transformedRow
        }
        
        # Save results
        $outputFile = Join-Path -Path $OutputPath -ChildPath "processed_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv"
        $results | Export-Csv -Path $outputFile -NoTypeInformation
        
        # Also save as JSON for flexibility
        $jsonOutputFile = [System.IO.Path]::ChangeExtension($outputFile, ".json")
        $results | ConvertTo-Json | Out-File -FilePath $jsonOutputFile
        
        Write-Verbose "Processing complete. Output saved to: $outputFile and $jsonOutputFile"
        return $outputFile
    }
    catch {
        Write-Error "Error processing file: $_"
        throw
    }
}

# Function to log execution details (new in this version)
function Write-ExecutionLog {
    param (
        [string]$Message,
        [string]$LogPath = ".\execution.log"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] $Message"
    
    Add-Content -Path $LogPath -Value $logEntry
    Write-Verbose $logEntry
}

# Main script execution
try {
    Write-Verbose "Starting script execution"
    Write-ExecutionLog -Message "Script started with parameters: InputFile=$InputFile, OutputFolder=$OutputFolder, Force=$($Force.IsPresent), LogLevel=$LogLevel"
    
    # Validate input file
    if (Test-InputFile -FilePath $InputFile) {
        Write-Verbose "Input file validation passed"
        Write-ExecutionLog -Message "Input file validation passed for: $InputFile"
    }
    
    # Initialize output folder
    Initialize-OutputFolder -FolderPath $OutputFolder -ForceCreate $Force.IsPresent
    Write-ExecutionLog -Message "Output folder initialized: $OutputFolder"
    
    # Process the file
    $outputFile = Process-InputFile -InputPath $InputFile -OutputPath $OutputFolder
    Write-ExecutionLog -Message "File processing completed. Output: $outputFile"
    
    # Display summary
    Write-Host "Processing completed successfully!" -ForegroundColor Green
    Write-Host "Input file: $InputFile"
    Write-Host "Output file: $outputFile"
    Write-Host "Log level: $LogLevel"
    
    # Return success exit code
    Write-ExecutionLog -Message "Script completed successfully"
    exit 0
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Script execution failed" -ForegroundColor Red
    Write-ExecutionLog -Message "Script failed with error: $_"
    
    # Return error exit code
    exit 1
}
