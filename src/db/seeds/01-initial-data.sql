-- Create an admin user with randomly generated password
-- For production, you should change this password immediately after setup
-- Current hash is for a randomly generated password
INSERT INTO users (username, email, password_hash, role)
VALUES 
  ('admin', 'admin@example.com', '$2b$10$V2AZQJ/zLnSA2C0UBH3hO.DSRb0olqB/ZSa36L4vF/qI6aiGrBAHG', 'admin');

-- Create some categories
INSERT INTO categories (name, description)
VALUES 
  ('System Administration', 'Scripts for system administration tasks'),
  ('Security', 'Scripts for security-related tasks'),
  ('Automation', 'Scripts for automating common tasks'),
  ('Development', 'Scripts useful for software development'),
  ('Utility', 'General utility scripts');

-- Create some tags
INSERT INTO tags (name)
VALUES 
  ('Active Directory'),
  ('Network'),
  ('File System'),
  ('Registry'),
  ('Performance'),
  ('Monitoring'),
  ('Security'),
  ('Installation'),
  ('Configuration'),
  ('Debugging');

-- Create a sample script
INSERT INTO scripts (title, description, content, user_id, category_id, is_public, version)
VALUES (
  'Get System Information', 
  'A simple script to collect and display system information', 
  '# Get System Information
# This script collects various system details and displays them in a formatted output

function Get-SystemInfo {
    [CmdletBinding()]
    param()
    
    $ComputerSystem = Get-CimInstance -ClassName Win32_ComputerSystem
    $OperatingSystem = Get-CimInstance -ClassName Win32_OperatingSystem
    $Processor = Get-CimInstance -ClassName Win32_Processor
    $LogicalDisk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DriveType=3"
    
    $SystemInfo = [PSCustomObject]@{
        ComputerName = $ComputerSystem.Name
        Manufacturer = $ComputerSystem.Manufacturer
        Model = $ComputerSystem.Model
        OperatingSystem = $OperatingSystem.Caption
        OSVersion = $OperatingSystem.Version
        OSBuild = $OperatingSystem.BuildNumber
        LastBoot = $OperatingSystem.LastBootUpTime
        Uptime = (Get-Date) - $OperatingSystem.LastBootUpTime
        InstalledRAM = [math]::Round($ComputerSystem.TotalPhysicalMemory / 1GB, 2)
        Processor = $Processor.Name
        LogicalCores = $Processor.NumberOfLogicalProcessors
        PhysicalCores = $Processor.NumberOfCores
        DiskInfo = foreach ($Disk in $LogicalDisk) {
            [PSCustomObject]@{
                Drive = $Disk.DeviceID
                Size = [math]::Round($Disk.Size / 1GB, 2)
                FreeSpace = [math]::Round($Disk.FreeSpace / 1GB, 2)
                PercentFree = [math]::Round(($Disk.FreeSpace / $Disk.Size) * 100, 2)
            }
        }
    }
    
    return $SystemInfo
}

$SystemInfo = Get-SystemInfo

# Format output
Write-Host "===== System Information =====" -ForegroundColor Cyan
Write-Host "Computer Name: $($SystemInfo.ComputerName)" -ForegroundColor Green
Write-Host "Manufacturer: $($SystemInfo.Manufacturer)" -ForegroundColor Green
Write-Host "Model: $($SystemInfo.Model)" -ForegroundColor Green
Write-Host ""
Write-Host "===== Operating System =====" -ForegroundColor Cyan
Write-Host "OS: $($SystemInfo.OperatingSystem)" -ForegroundColor Green
Write-Host "Version: $($SystemInfo.OSVersion)" -ForegroundColor Green
Write-Host "Build: $($SystemInfo.OSBuild)" -ForegroundColor Green
Write-Host "Last Boot: $($SystemInfo.LastBoot)" -ForegroundColor Green
Write-Host "Uptime: $($SystemInfo.Uptime.Days) days, $($SystemInfo.Uptime.Hours) hours, $($SystemInfo.Uptime.Minutes) minutes" -ForegroundColor Green
Write-Host ""
Write-Host "===== Hardware =====" -ForegroundColor Cyan
Write-Host "Processor: $($SystemInfo.Processor)" -ForegroundColor Green
Write-Host "Physical Cores: $($SystemInfo.PhysicalCores)" -ForegroundColor Green
Write-Host "Logical Cores: $($SystemInfo.LogicalCores)" -ForegroundColor Green
Write-Host "Installed RAM: $($SystemInfo.InstalledRAM) GB" -ForegroundColor Green
Write-Host ""
Write-Host "===== Disk Information =====" -ForegroundColor Cyan
foreach ($Disk in $SystemInfo.DiskInfo) {
    Write-Host "Drive $($Disk.Drive)" -ForegroundColor Green
    Write-Host "  Size: $($Disk.Size) GB" -ForegroundColor Green
    Write-Host "  Free Space: $($Disk.FreeSpace) GB" -ForegroundColor Green
    Write-Host "  Percent Free: $($Disk.PercentFree)%" -ForegroundColor Green
    if ($Disk.PercentFree -lt 20) {
        Write-Host "  WARNING: Low disk space!" -ForegroundColor Red
    }
    Write-Host ""
}
', 
  1, 
  1, 
  true, 
  1
);

-- Add tags to the script
INSERT INTO script_tags (script_id, tag_id)
VALUES 
  (1, 5),  -- Performance
  (1, 6);  -- Monitoring

-- Create a sample script analysis
INSERT INTO script_analysis (script_id, purpose, security_score, quality_score, risk_score, parameter_docs, suggestions)
VALUES (
  1, 
  'This script collects and displays system information including hardware, operating system, and disk space details.',
  0.85, 
  0.9, 
  0.2, 
  '{"Get-SystemInfo": {"Description": "Collects system information", "Parameters": {}}}', 
  '[{"type": "improvement", "description": "Consider adding parameter validation"}, {"type": "security", "description": "No security concerns detected"}]'
);

-- Create chat_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  messages JSONB NOT NULL,
  response TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  embedding vector(1536) NULL
);