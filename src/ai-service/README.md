# Agentic AI Assistant for PowerShell Script Analysis

This service implements an advanced agentic workflow for PowerShell script analysis using OpenAI's Assistants API. The agent can search the internet, find similar scripts, and provide comprehensive analysis with security recommendations.

## Features

- **Agentic Workflows**: Autonomous AI agents that can perform complex workflows
- **Internet Search**: Finds relevant PowerShell documentation and best practices
- **Script Comparison**: Identifies similar scripts for reference
- **Comprehensive Analysis**: Security scoring, code quality assessment, and optimization suggestions
- **Command Documentation**: Detailed documentation for each PowerShell command used
- **Error Handling**: Robust error handling and logging

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.template .env
```

3. Edit the `.env` file and fill in:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `OPENAI_ASSISTANT_ID` - Optional pre-configured Assistant ID
   - `SEARCH_API_KEY` - Google Search API key (for internet search capability)
   - `SEARCH_ENGINE_ID` - Google Custom Search Engine ID

4. Start the service:

```bash
npm start
```

## Integration with Main Application

This AI service integrates with the main PowerShell Script Analyzer application. The backend already has the necessary endpoints to communicate with this service.

### Configuration

Ensure the main application is configured to point to this service:

1. In the backend's `.env` file, set:

```env
AI_SERVICE_URL=http://localhost:8000
```

2. For Docker deployments, use:

```env
AI_SERVICE_URL=http://ai-service:8000
```

### API Endpoints

#### Analyze a script with the AI Assistant

```http
POST /analyze/assistant
```

Request body:

```json
{
  "content": "# PowerShell script content here",
  "filename": "example.ps1",
  "assistant_id": "optional-assistant-id"
}
```

Headers:

```http
x-api-key: your-openai-api-key
```

Response:

```json
{
  "analysis": {
    "purpose": "Script purpose description",
    "securityScore": 85,
    "codeQualityScore": 90,
    "riskScore": 15,
    "suggestions": [
      "Use more secure parameter validation",
      "Add error handling around network operations"
    ],
    "commandDetails": {
      "Get-Process": {
        "description": "Gets the processes running on the local computer",
        "parameters": [
          {
            "name": "Name",
            "description": "Specifies the process names to retrieve"
          }
        ]
      }
    },
    "msDocsReferences": [
      {
        "title": "Get-Process Documentation",
        "url": "https://docs.microsoft.com/en-us/powershell/module/microsoft.powershell.management/get-process"
      }
    ]
  },
  "threadId": "thread_abc123",
  "assistantId": "asst_def456"
}
```

## Example Usage

Here's how to analyze a script from the command line:

```bash
curl -X POST http://localhost:8000/analyze/assistant \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-openai-api-key" \
  -d '{
    "content": "Get-Process | Where-Object { $_.CPU -gt 10 } | Select-Object Name, CPU, Memory",
    "filename": "process-monitor.ps1"
  }'
```

## Agentic Workflow Process

1. **Script Submission**: User submits a PowerShell script for analysis
2. **Initial Analysis**: AI Assistant performs preliminary analysis of the script structure
3. **Internet Research**: When needed, the agent searches the internet for relevant documentation
4. **Similar Script Comparison**: Finds and references similar scripts to identify patterns
5. **Comprehensive Analysis**: Combines all gathered information to provide detailed analysis
6. **Response Generation**: Formats results with security scores, quality assessment, and specific recommendations

## Advanced Configuration

### Custom Assistant Creation

You can create a custom assistant optimized for your specific needs:

1. Create an assistant through OpenAI's platform
2. Configure it with the appropriate tools (code_interpreter, retrieval, function calling)
3. Set the assistant ID in your `.env` file

### Performance Tuning

Adjust the following parameters for optimal performance:

- **Model Selection**: Change the model in the assistant creation (e.g., from gpt-4-turbo to gpt-4o)
- **Timeout**: Modify the axios timeout values for larger scripts
- **Concurrency**: The service handles requests sequentially by default
