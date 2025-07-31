# Claude Flow - PSScript Project

Claude Flow has been initialized for the PSScript PowerShell Script Management Platform.

## Quick Start

```bash
# Run a workflow
claude-flow run analyze-script --script_path ./scripts/example.ps1

# Run security audit
claude-flow run security-audit --target_directory ./src/backend/uploads

# Run daily maintenance
claude-flow run daily-maintenance

# Create new PowerShell script from template
claude-flow new powershell-script --script_name Get-SystemInfo

# Create new React component from template
claude-flow new react-component --component_name ScriptAnalyzer
```

## Directory Structure

```
.claude-flow/
├── workflows/          # Workflow definitions
│   ├── daily-maintenance.yaml
│   └── security-audit.yaml
├── templates/          # File templates
│   ├── powershell-script.yaml
│   └── react-component.yaml
└── cache/             # Cached results and artifacts
```

## Available Workflows

### 1. **analyze-script**
Analyzes PowerShell scripts for security, performance, and best practices.

### 2. **generate-tests**
Generates Pester unit tests for PowerShell scripts.

### 3. **fix-issues**
Automatically fixes linting and code quality issues.

### 4. **update-docs**
Updates project documentation based on current codebase.

### 5. **daily-maintenance**
Performs daily health checks and generates status reports.

### 6. **security-audit**
Comprehensive security analysis of PowerShell scripts.

## Configuration

Edit `claude-flow.yaml` to customize:
- AI model settings
- Cache behavior
- Output formatting
- Custom workflows
- Templates

## Integration with PSScript

Claude Flow is configured to work seamlessly with your PSScript project:

- Uses existing npm scripts for linting
- Integrates with Docker Compose for service management
- Follows project structure for file organization
- Compatible with existing testing frameworks

## Next Steps

1. Install Claude Flow CLI: `npm install -g claude-flow`
2. Authenticate: `claude-flow auth login`
3. Run your first workflow: `claude-flow run analyze-script --script_path ./test-script.ps1`

For more information, see the [Claude Flow documentation](https://docs.claude.ai/flow).