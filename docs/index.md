# PowerShell Script Manager

## Introduction

Welcome to the PowerShell Script Manager - your comprehensive solution for managing, analyzing, and executing PowerShell scripts with AI-powered assistance. This documentation will guide you through installation, configuration, and usage of the application.

![Application Overview](https://via.placeholder.com/800x400.png?text=Application+Overview)

## Table of Contents

1. [Quick Start](#quick-start)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Feature Details](#feature-details)
5. [Advanced Usage](#advanced-usage)
6. [Troubleshooting](#troubleshooting)
7. [Frequently Asked Questions and Support](#frequently-asked-questions-and-support)
8. [API Reference](#api-reference)
9. [Agentic AI Features](#agentic-ai-features)

## Quick Start

Get up and running in minutes:

1. Install the application
2. Configure your settings
3. Start managing your scripts

For detailed instructions, see the [Installation](#installation) section.

## Quick Links

- [Setup Guide](#installation)
- [API Documentation](#api-reference)
- [FAQs](#frequently-asked-questions-and-support)
- [Agentic AI Features](#agentic-ai-features)
- [Feature Details](#feature-details)

## Key Features

- **Script Management**: Organize and categorize your PowerShell scripts
- **AI Assistance**: Get real-time suggestions and optimizations
- **Execution Environment**: Run scripts in a secure sandbox
- **Version Control**: Track changes and revert when needed
- **Collaboration**: Share scripts with team members

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| OS | Windows 10/11, macOS 10.15+, Linux (Ubuntu 20.04+) |
| CPU | Dual-core 2.0 GHz |
| RAM | 4 GB |
| Storage | 500 MB available space |
| PowerShell | Version 5.1+ |

### Recommended Requirements

| Component | Recommendation |
|-----------|----------------|
| OS | Windows 11, macOS 12+, Linux (Ubuntu 22.04+) |
| CPU | Quad-core 3.0 GHz |
| RAM | 8 GB |
| Storage | 1 GB available space |
| PowerShell | Version 7.2+ |

![System Requirements Diagram](https://via.placeholder.com/800x400.png?text=System+Requirements+Diagram)

## Setup

For detailed setup instructions, please visit our [Setup Guide](#installation).

## Installation

### Windows

1. **Download the installer**
   - [Windows Installer](https://example.com/download/windows)

2. **Run the installer**
   ```powershell
   Start-Process -FilePath 'PowerShellScriptManagerSetup.exe'
   ```

3. **Follow the installation wizard**

4. **Verify installation**
   ```powershell
   Get-Command -Module PowerShellScriptManager
   ```

### macOS/Linux

1. **Install via package manager**
   ```bash
   # macOS
   brew install psscript

   # Linux
   sudo apt-get install psscript
   ```

2. **Verify installation**
   ```bash
   psscript --version
   ```

![Installation Process](https://via.placeholder.com/800x400.png?text=Installation+Process)

## Feature Details

### Core Functionality

1. **Script Organization**
   - Create folders and categories
   - Add tags and metadata
   - Search and filter scripts

2. **Execution Management**
   - Run scripts with parameters
   - Schedule script execution
   - Monitor running scripts

3. **Version Control**
   - Track changes
   - Compare versions
   - Revert to previous versions

### Advanced Features

#### AI Integration

- **Code Suggestions**
  ```powershell
  Get-AISuggestion -ScriptId 123
  ```

- **Code Optimization**
  ```powershell
  Optimize-PSScript -Id 123
  ```

#### Collaboration Tools

- **Share Scripts**
  ```powershell
  Share-PSScript -Id 123 -With 'user@domain.com'
  ```

- **Comment and Review**
  ```powershell
  Add-Comment -ScriptId 123 -Text 'Needs error handling'
  ```

![Feature Overview](https://via.placeholder.com/800x400.png?text=Feature+Overview)

## Advanced Usage

### Best Practices

1. Use version control for all scripts
2. Regularly back up your scripts
3. Follow PowerShell coding conventions

### Performance Optimization

- Use efficient data structures
- Minimize I/O operations
- Leverage parallel processing where applicable

### Security Considerations

- Always validate input
- Use secure credential management
- Regularly audit your scripts

## User Interface Overview

The PowerShell Script Manager features an intuitive interface designed for both beginners and advanced users. Here's a breakdown of the main components:

### Main Window

![Main Window](https://via.placeholder.com/800x400.png?text=Main+Window)

1. **Navigation Panel**
   - Quick access to different sections
   - Script categories and tags
   - Search functionality

2. **Editor Area**
   - Syntax highlighting
   - IntelliSense support
   - Error checking
   - AI suggestions

3. **Output Panel**
   - Execution results
   - Debug information
   - Logs

### Script Management Capabilities

#### Script Management Features

- **Create New Script**

  ```powershell
  New-PSScript -Name 'MyScript' -Category 'Automation'
  ```

- **Edit Existing Script**

  ```powershell
  Edit-PSScript -Id 123
  ```

#### Execution Features

- **Run Script**

  ```powershell
  Invoke-PSScript -Id 123
  ```

- **Debug Script**

  ```powershell
  Debug-PSScript -Id 123
  ```

#### AI Features

- **Get Suggestions**

  ```powershell
  Get-AISuggestion -ScriptId 123
  ```

- **Optimize Script**

  ```powershell
  Optimize-PSScript -Id 123
  ```

![UI Components Diagram](https://via.placeholder.com/800x400.png?text=UI+Components+Diagram)

## API Reference

### REST API Endpoints

#### Script Management

- `GET /api/scripts` - List all scripts
- `GET /api/scripts/{id}` - Get script details
- `POST /api/scripts` - Upload a new script
- `PUT /api/scripts/{id}` - Update an existing script
- `DELETE /api/scripts/{id}` - Delete a script

#### Script Analysis

- `POST /api/analyze` - Analyze a script
- `POST /api/analyze/security` - Security analysis
- `POST /api/analyze/optimization` - Optimization analysis
- `POST /api/analyze/assistant` - Enhanced analysis using OpenAI Assistant with code interpreter

#### Chat Interfaces

- `POST /api/chat` - Chat with PowerShell expert
- `POST /api/chat` (with `agent_type=assistant`) - Chat with OpenAI Assistant-powered agent

### API Usage Examples

#### Analyzing a Script

```json
POST /api/analyze
{
  "content": "# Your PowerShell script content",
  "script_name": "example.ps1"
}
```

#### Chat with PowerShell Expert

```json
POST /api/chat
{
  "messages": [
    {
      "role": "user",
      "content": "How do I securely handle credentials in PowerShell?"
    }
  ]
}
```

#### Chat with OpenAI Assistant Agent

```json
POST /api/chat
{
  "messages": [
    {
      "role": "user",
      "content": "How do I securely handle credentials in PowerShell?"
    }
  ],
  "agent_type": "assistant",
  "session_id": "optional-persistent-session-id"
}
```

## Agentic AI Features

PowerShell Script Manager now includes powerful agentic AI capabilities powered by OpenAI's Assistants API. These features enable more intelligent, autonomous, and context-aware script analysis and assistance.

### Key Agentic Features

#### 1. Enhanced Script Analysis

The `/api/analyze/assistant` endpoint provides deeper script analysis using code interpretation capabilities:

- Dynamic execution analysis
- More detailed security risk assessment
- Advanced optimization recommendations
- Best practices evaluation

#### 2. Persistent Chat Sessions

Chat with assistant agents that maintain context across interactions:

- Sessions persist between page refreshes
- Maintain conversation history and context
- Enable multi-turn complex problem solving

#### 3. Code Interpreter Support

The assistant can:

- Interpret and execute PowerShell code
- Test snippets for security and functionality
- Generate improved versions of code
- Explain complex code constructs in detail

### Using Agentic Features

1. **Setup**
   - Run `./install-openai-assistant.sh` to install dependencies
   - Add your OpenAI API key to the `.env` file

2. **Starting the System**
   - Use `./start-all-agentic.sh` to start all services with agentic capabilities

3. **API Access**
   - Include `agent_type: "assistant"` in your chat requests
   - Save and reuse the `session_id` for persistent conversations

4. **Script Analysis**
   - Send script content to `/api/analyze/assistant` for advanced analysis

### Example: Advanced Security Analysis with Code Interpreter

```json
POST /api/analyze/assistant
{
  "content": "# Your PowerShell script",
  "script_name": "example.ps1",
  "analysis_type": "security"
}
```

This will return a comprehensive security analysis with specific vulnerability details and remediation recommendations.

## Configuration

### Initial Setup

1. **Launch the application**
   ```powershell
   Start-PSScriptManager
   ```

2. **Configure settings**
   ```powershell
   Set-PSScriptManagerConfig -Path 'C:\Scripts' -AutoSave $true
   ```

3. **Set up AI integration**
   ```powershell
   Set-AIConfig -APIKey 'your-api-key'
   ```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PSSM_HOME` | Application home directory | `~/.psscript` |
| `PSSM_LOG_LEVEL` | Logging level | `INFO` |
| `PSSM_MAX_SCRIPTS` | Maximum stored scripts | `1000` |

![Configuration Diagram](https://via.placeholder.com/800x400.png?text=Configuration+Diagram)

## Troubleshooting

### Common Issues

1. **Connection Errors**
   - Verify network connectivity
   - Check API URL configuration
   - Ensure backend service is running

2. **Script Execution Failures**
   - Check script syntax
   - Verify required modules are installed
   - Review execution permissions

3. **AI Integration Issues**
   - Verify API key is valid
   - Check internet connectivity
   - Ensure AI service is available

### Diagnostic Commands

- **Check Service Status**
  ```powershell
  Get-PSServiceStatus
  ```

- **View Logs**
  ```powershell
  Get-PSScriptLogs -Level Error
  ```

## Frequently Asked Questions and Support

### General

**Q: How do I update the application?**
A: Use the built-in update command:
```powershell
Update-PSScriptManager
```

### Configuration

**Q: Where are configuration files stored?**
A: Configuration is stored in `~/.psscript/config.json`

### Usage

**Q: How do I share scripts with team members?**
A: Use the share command:
```powershell
Share-PSScript -Id 123 -With 'team@domain.com'
```
