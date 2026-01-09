# AI Service API Contract

This document defines the API contract between the backend and the FastAPI AI service in `src/ai/main.py`.

## Base URL

```
http://<ai-service-host>:8000
```

## Authentication

Send the AI provider key with requests as the header below when running in production:

```
X-API-KEY: <openai_api_key>
```

## Endpoints

### POST `/analyze`

Analyze a PowerShell script and return structured analysis.

**Query Parameters**

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `include_command_details` | boolean | `false` | Include per-command details. |
| `fetch_ms_docs` | boolean | `false` | Fetch Microsoft Docs references. |

**Request Body**

```json
{
  "content": "string",
  "script_id": 123,
  "script_name": "optional-name.ps1"
}
```

**Response**

```json
{
  "purpose": "string",
  "security_analysis": "string",
  "security_score": 5,
  "code_quality_score": 5,
  "parameters": {},
  "category": "Utilities & Helpers",
  "category_id": 10,
  "command_details": [],
  "ms_docs_references": [],
  "optimization": [],
  "risk_score": 5
}
```

### POST `/chat`

Chat with the PowerShell expert assistant.

**Request Body**

```json
{
  "messages": [
    { "role": "user", "content": "string" }
  ],
  "system_prompt": "optional system prompt",
  "agent_type": "assistant",
  "session_id": "optional-session"
}
```

**Response**

```json
{
  "response": "string",
  "session_id": "optional-session"
}
```

### POST `/embedding`

Create an embedding for script content.

**Request Body**

```json
{
  "content": "string"
}
```

**Response**

```json
{
  "embedding": [0.01, 0.02]
}
```

### POST `/similar`

Find similar scripts based on content or stored script ID.

**Request Body**

```json
{
  "script_id": 123,
  "content": "optional-content",
  "limit": 5
}
```

**Response**

```json
{
  "similar_scripts": [
    {
      "script_id": 456,
      "title": "string",
      "similarity": 0.85
    }
  ]
}
```

### GET `/health`

Health check for the AI service.

**Response**

```json
{
  "status": "healthy",
  "timestamp": 1710000000,
  "checks": {
    "api_key": true,
    "database": true,
    "agent_coordinator": "enabled",
    "mode": "production"
  }
}
```
