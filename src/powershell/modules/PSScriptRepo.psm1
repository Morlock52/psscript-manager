#
# PSScriptRepo - PowerShell module for interacting with the Script Repository
#

# Module configuration
$script:ApiBaseUrl = $null
$script:AuthToken = $null

function Initialize-PSScriptRepo {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$ApiUrl,
        
        [Parameter(Mandatory = $false)]
        [string]$TokenPath
    )

    $script:ApiBaseUrl = $ApiUrl.TrimEnd('/')
    
    if ($TokenPath -and (Test-Path $TokenPath)) {
        $script:AuthToken = Get-Content -Path $TokenPath -Raw
        Write-Verbose "Authentication token loaded from $TokenPath"
    }
    
    Write-Output "PSScriptRepo initialized with API URL: $ApiBaseUrl"
}

function Connect-PSScriptRepo {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$Username,
        
        [Parameter(Mandatory = $true)]
        [securestring]$Password,
        
        [Parameter(Mandatory = $false)]
        [switch]$SaveToken,
        
        [Parameter(Mandatory = $false)]
        [string]$TokenPath = "~/.psscriptrepo_token"
    )
    
    if (-not $script:ApiBaseUrl) {
        throw "Repository not initialized. Call Initialize-PSScriptRepo first."
    }
    
    try {
        $PasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
            [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($Password)
        )
        
        $Body = @{
            username = $Username
            password = $PasswordPlain
        } | ConvertTo-Json
        
        $Response = Invoke-RestMethod -Uri "$script:ApiBaseUrl/auth/login" -Method Post -Body $Body -ContentType "application/json"
        $script:AuthToken = $Response.token
        
        if ($SaveToken -and $script:AuthToken) {
            $ExpandedPath = [System.Environment]::ExpandEnvironmentVariables($TokenPath)
            $script:AuthToken | Out-File -FilePath $ExpandedPath -Force
            Write-Verbose "Token saved to $ExpandedPath"
        }
        
        Write-Output "Successfully connected to PSScriptRepo as $Username"
    }
    catch {
        Write-Error "Failed to authenticate: $_"
    }
}

function Get-PSScript {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $false)]
        [string]$Id,
        
        [Parameter(Mandatory = $false)]
        [string]$Query,
        
        [Parameter(Mandatory = $false)]
        [string]$Category,
        
        [Parameter(Mandatory = $false)]
        [string[]]$Tags,
        
        [Parameter(Mandatory = $false)]
        [switch]$MyScripts,
        
        [Parameter(Mandatory = $false)]
        [int]$Limit = 20,
        
        [Parameter(Mandatory = $false)]
        [int]$Offset = 0
    )
    
    if (-not $script:ApiBaseUrl) {
        throw "Repository not initialized. Call Initialize-PSScriptRepo first."
    }
    
    $Headers = @{}
    if ($script:AuthToken) {
        $Headers["Authorization"] = "Bearer $script:AuthToken"
    }
    
    try {
        if ($Id) {
            $Response = Invoke-RestMethod -Uri "$script:ApiBaseUrl/scripts/$Id" -Method Get -Headers $Headers
            return $Response
        }
        else {
            $QueryParams = @()
            
            if ($Query) { $QueryParams += "query=$Query" }
            if ($Category) { $QueryParams += "category=$Category" }
            if ($Tags) { $QueryParams += "tags=$($Tags -join ',')" }
            if ($MyScripts) { $QueryParams += "myScripts=true" }
            if ($Limit) { $QueryParams += "limit=$Limit" }
            if ($Offset) { $QueryParams += "offset=$Offset" }
            
            $QueryString = if ($QueryParams) { "?" + ($QueryParams -join "&") } else { "" }
            
            $Response = Invoke-RestMethod -Uri "$script:ApiBaseUrl/scripts$QueryString" -Method Get -Headers $Headers
            return $Response
        }
    }
    catch {
        Write-Error "Failed to retrieve scripts: $_"
    }
}

function Invoke-PSScript {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$Id,
        
        [Parameter(Mandatory = $false)]
        [hashtable]$Parameters,
        
        [Parameter(Mandatory = $false)]
        [switch]$Sandbox
    )
    
    if (-not $script:ApiBaseUrl) {
        throw "Repository not initialized. Call Initialize-PSScriptRepo first."
    }
    
    if (-not $script:AuthToken) {
        throw "Authentication required. Call Connect-PSScriptRepo first."
    }
    
    $Headers = @{
        "Authorization" = "Bearer $script:AuthToken"
    }
    
    try {
        # First, retrieve the script
        $Script = Get-PSScript -Id $Id
        
        if (-not $Script) {
            throw "Script with ID $Id not found."
        }
        
        Write-Verbose "Executing script: $($Script.title)"
        
        if ($Sandbox) {
            # Execute on server in sandbox
            $Body = @{
                parameters = $Parameters
            } | ConvertTo-Json
            
            $Response = Invoke-RestMethod -Uri "$script:ApiBaseUrl/scripts/$Id/execute" -Method Post -Body $Body -ContentType "application/json" -Headers $Headers
            return $Response
        }
        else {
            # Execute locally
            Write-Verbose "Executing script locally: $($Script.title)"
            
            $TempFile = [System.IO.Path]::GetTempFileName() + ".ps1"
            try {
                $Script.content | Out-File -FilePath $TempFile -Encoding utf8
                
                if ($Parameters) {
                    $ParamBlock = New-Object System.Collections.ArrayList
                    foreach ($Key in $Parameters.Keys) {
                        $Value = $Parameters[$Key]
                        $ParamBlock.Add("-$Key '$Value'") | Out-Null
                    }
                    $ParamString = $ParamBlock -join " "
                    
                    $Result = Invoke-Expression "& '$TempFile' $ParamString"
                }
                else {
                    $Result = Invoke-Expression "& '$TempFile'"
                }
                
                return $Result
            }
            finally {
                if (Test-Path $TempFile) {
                    Remove-Item -Path $TempFile -Force
                }
            }
        }
    }
    catch {
        Write-Error "Failed to execute script: $_"
    }
}

function Add-PSScript {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$Path,
        
        [Parameter(Mandatory = $false)]
        [string]$Title,
        
        [Parameter(Mandatory = $false)]
        [string]$Description,
        
        [Parameter(Mandatory = $false)]
        [string]$Category,
        
        [Parameter(Mandatory = $false)]
        [string[]]$Tags,
        
        [Parameter(Mandatory = $false)]
        [switch]$AnalyzeWithAI,
        
        [Parameter(Mandatory = $false)]
        [switch]$Public
    )
    
    if (-not $script:ApiBaseUrl) {
        throw "Repository not initialized. Call Initialize-PSScriptRepo first."
    }
    
    if (-not $script:AuthToken) {
        throw "Authentication required. Call Connect-PSScriptRepo first."
    }
    
    if (-not (Test-Path $Path)) {
        throw "File not found: $Path"
    }
    
    $Headers = @{
        "Authorization" = "Bearer $script:AuthToken"
    }
    
    try {
        $Content = Get-Content -Path $Path -Raw
        
        if (-not $Title) {
            # Try to parse title from the script file (first comment block or filename)
            $CommentHeader = [regex]::Match($Content, '<#(.*?)#>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
            
            if ($CommentHeader.Success) {
                $TitleMatch = [regex]::Match($CommentHeader.Value, '(?m)^\s*\.SYNOPSIS\s*$(.*?)(?=^\s*\.|\z)', [System.Text.RegularExpressions.RegexOptions]::Singleline)
                if ($TitleMatch.Success -and $TitleMatch.Groups[1].Value.Trim()) {
                    $Title = $TitleMatch.Groups[1].Value.Trim()
                }
            }
            
            if (-not $Title) {
                $Title = [System.IO.Path]::GetFileNameWithoutExtension($Path)
            }
        }
        
        $Body = @{
            title = $Title
            content = $Content
            is_public = $Public.IsPresent
            analyze_with_ai = $AnalyzeWithAI.IsPresent
        }
        
        if ($Description) { $Body["description"] = $Description }
        if ($Category) { $Body["category"] = $Category }
        if ($Tags) { $Body["tags"] = $Tags }
        
        $JsonBody = $Body | ConvertTo-Json
        
        $Response = Invoke-RestMethod -Uri "$script:ApiBaseUrl/scripts" -Method Post -Body $JsonBody -ContentType "application/json" -Headers $Headers
        Write-Output "Script uploaded successfully. ID: $($Response.id)"
        return $Response
    }
    catch {
        Write-Error "Failed to upload script: $_"
    }
}

function Update-PSScript {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$Id,
        
        [Parameter(Mandatory = $false)]
        [string]$Path,
        
        [Parameter(Mandatory = $false)]
        [string]$Content,
        
        [Parameter(Mandatory = $false)]
        [string]$Title,
        
        [Parameter(Mandatory = $false)]
        [string]$Description,
        
        [Parameter(Mandatory = $false)]
        [string]$Category,
        
        [Parameter(Mandatory = $false)]
        [string[]]$Tags,
        
        [Parameter(Mandatory = $false)]
        [string]$CommitMessage,
        
        [Parameter(Mandatory = $false)]
        [switch]$AnalyzeWithAI
    )
    
    if (-not $script:ApiBaseUrl) {
        throw "Repository not initialized. Call Initialize-PSScriptRepo first."
    }
    
    if (-not $script:AuthToken) {
        throw "Authentication required. Call Connect-PSScriptRepo first."
    }
    
    if ($Path -and -not $Content -and -not (Test-Path $Path)) {
        throw "File not found: $Path"
    }
    
    $Headers = @{
        "Authorization" = "Bearer $script:AuthToken"
    }
    
    try {
        $Body = @{}
        
        if ($Path) {
            $Body["content"] = Get-Content -Path $Path -Raw
        }
        elseif ($Content) {
            $Body["content"] = $Content
        }
        
        if ($Title) { $Body["title"] = $Title }
        if ($Description) { $Body["description"] = $Description }
        if ($Category) { $Body["category"] = $Category }
        if ($Tags) { $Body["tags"] = $Tags }
        if ($CommitMessage) { $Body["commit_message"] = $CommitMessage }
        if ($AnalyzeWithAI) { $Body["analyze_with_ai"] = $true }
        
        $JsonBody = $Body | ConvertTo-Json
        
        $Response = Invoke-RestMethod -Uri "$script:ApiBaseUrl/scripts/$Id" -Method Put -Body $JsonBody -ContentType "application/json" -Headers $Headers
        Write-Output "Script updated successfully. New version: $($Response.version)"
        return $Response
    }
    catch {
        Write-Error "Failed to update script: $_"
    }
}

function Get-PSScriptAnalysis {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true)]
        [string]$Id
    )
    
    if (-not $script:ApiBaseUrl) {
        throw "Repository not initialized. Call Initialize-PSScriptRepo first."
    }
    
    $Headers = @{}
    if ($script:AuthToken) {
        $Headers["Authorization"] = "Bearer $script:AuthToken"
    }
    
    try {
        $Response = Invoke-RestMethod -Uri "$script:ApiBaseUrl/scripts/$Id/analysis" -Method Get -Headers $Headers
        return $Response
    }
    catch {
        Write-Error "Failed to retrieve script analysis: $_"
    }
}

function Find-SimilarPSScripts {
    [CmdletBinding()]
    param (
        [Parameter(Mandatory = $true, ParameterSetName = "ById")]
        [string]$Id,
        
        [Parameter(Mandatory = $true, ParameterSetName = "ByContent")]
        [string]$Content,
        
        [Parameter(Mandatory = $false)]
        [int]$Limit = 5
    )
    
    if (-not $script:ApiBaseUrl) {
        throw "Repository not initialized. Call Initialize-PSScriptRepo first."
    }
    
    $Headers = @{}
    if ($script:AuthToken) {
        $Headers["Authorization"] = "Bearer $script:AuthToken"
    }
    
    try {
        if ($PSCmdlet.ParameterSetName -eq "ById") {
            $Response = Invoke-RestMethod -Uri "$script:ApiBaseUrl/scripts/$Id/similar?limit=$Limit" -Method Get -Headers $Headers
        }
        else {
            $Body = @{
                content = $Content
                limit = $Limit
            } | ConvertTo-Json
            
            $Response = Invoke-RestMethod -Uri "$script:ApiBaseUrl/scripts/similar" -Method Post -Body $Body -ContentType "application/json" -Headers $Headers
        }
        
        return $Response
    }
    catch {
        Write-Error "Failed to find similar scripts: $_"
    }
}

# Export module functions
Export-ModuleMember -Function Initialize-PSScriptRepo, Connect-PSScriptRepo, Get-PSScript, Invoke-PSScript, Add-PSScript, Update-PSScript, Get-PSScriptAnalysis, Find-SimilarPSScripts