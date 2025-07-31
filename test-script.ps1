# PSScript Test Script
# This script demonstrates various PowerShell features for testing the PSScript platform

<#
.SYNOPSIS
A test script for PSScript platform testing.

.DESCRIPTION
This script includes various PowerShell features and patterns to test the analysis capabilities
of the PSScript platform. It includes parameters, error handling, and common PowerShell commands.

.PARAMETER InputFile
Path to an input file to process.

.PARAMETER OutputFolder
Path to the folder where output will be saved.

.PARAMETER Force
Switch to force overwrite of existing files.

.EXAMPLE
.\test-script.ps1 -InputFile "data.csv" -OutputFolder "C:\Output"

.NOTES
Created for PSScript platform testing.
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $true, Position = 0)]
    [ValidateNotNullOrEmpty()]
    [string]$InputFile,
    
    [Parameter(Mandatory = $false, Position = 1)]
    [string]$OutputFolder = ".\output",
    
    [Parameter(Mandatory = $false)]
    [switch]$Force
)

# Error handling setup
$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

# Function to validate input file
function Test-InputFile {
    param (
        [string]$FilePath
    )
    
    if (-not (Test-Path -Path $FilePath -PathType Leaf)) {
        throw "Input file not found: $FilePath"
    }
    
    $extension = [System.IO.Path]::GetExtension($FilePath)
    if ($extension -ne ".csv" -and $extension -ne ".txt") {
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
        $data = Import-Csv -Path $InputPath
        
        # Process each row
        $results = @()
        foreach ($row in $data) {
            # Simple transformation - convert to uppercase
            $transformedRow = [PSCustomObject]@{
                OriginalValue = $row.Value
                TransformedValue = $row.Value.ToUpper()
                ProcessedDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
            }
            
            $results += $transformedRow
        }
        
        # Save results
        $outputFile = Join-Path -Path $OutputPath -ChildPath "processed_$(Get-Date -Format 'yyyyMMdd_HHmmss').csv"
        $results | Export-Csv -Path $outputFile -NoTypeInformation
        
        Write-Verbose "Processing complete. Output saved to: $outputFile"
        return $outputFile
    }
    catch {
        Write-Error "Error processing file: $_"
        throw
    }
}

# Main script execution
try {
    Write-Verbose "Starting script execution"
    
    # Validate input file
    if (Test-InputFile -FilePath $InputFile) {
        Write-Verbose "Input file validation passed"
    }
    
    # Initialize output folder
    Initialize-OutputFolder -FolderPath $OutputFolder -ForceCreate $Force.IsPresent
    
    # Process the file
    $outputFile = Process-InputFile -InputPath $InputFile -OutputPath $OutputFolder
    
    # Display summary
    Write-Host "Processing completed successfully!" -ForegroundColor Green
    Write-Host "Input file: $InputFile"
    Write-Host "Output file: $outputFile"
    
    # Return success exit code
    exit 0
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Script execution failed" -ForegroundColor Red
    
    # Return error exit code
    exit 1
}
