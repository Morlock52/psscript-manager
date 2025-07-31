# PSScript API Documentation

## Overview

The PSScript API provides programmatic access to all features of the PowerShell script management platform. This RESTful API supports JSON requests and responses.

## Base URLs

- **Development**: `http://localhost:4000/api`
- **Production**: `https://your-domain.com/api`

## Authentication

All API endpoints (except authentication endpoints) require a valid JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Obtaining a Token

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123!"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

## API Endpoints

### Authentication

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** User object with JWT token

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:** Created user object

#### POST /auth/logout
Logout current user (invalidates token).

**Headers:** Authorization required

**Response:** Success message

#### GET /auth/me
Get current authenticated user information.

**Headers:** Authorization required

**Response:** User object

### Script Management

#### GET /scripts
List all scripts accessible to the user.

**Query Parameters:**
- `page` (number): Page number for pagination
- `limit` (number): Items per page (default: 20)
- `category` (string): Filter by category
- `tag` (string): Filter by tag
- `search` (string): Search in script content and metadata

**Response:**
```json
{
  "scripts": [
    {
      "id": 1,
      "name": "Get-SystemInfo.ps1",
      "description": "Retrieves system information",
      "category": "System",
      "tags": ["monitoring", "system"],
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

#### GET /scripts/:id
Get detailed information about a specific script.

**Response:**
```json
{
  "id": 1,
  "name": "Get-SystemInfo.ps1",
  "description": "Retrieves system information",
  "content": "# PowerShell script content...",
  "category": "System",
  "tags": ["monitoring", "system"],
  "analysis": {
    "quality": 85,
    "security": 90,
    "performance": 80
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z"
}
```

#### POST /scripts
Upload a new PowerShell script.

**Request Body (multipart/form-data):**
- `file`: PowerShell script file (.ps1)
- `name` (optional): Override filename
- `description` (optional): Script description
- `category` (optional): Initial category
- `tags` (optional): Comma-separated tags

**Response:** Created script object

#### PUT /scripts/:id
Update an existing script.

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "content": "string",
  "category": "string",
  "tags": ["string"]
}
```

**Response:** Updated script object

#### DELETE /scripts/:id
Delete a script.

**Response:** Success message

### AI Features

#### POST /ai/analyze
Analyze a PowerShell script using AI.

**Request Body:**
```json
{
  "content": "string",
  "filename": "string (optional)",
  "requestType": "standard | detailed",
  "analysisOptions": {
    "includeSimilarScripts": true,
    "includeInternetSearch": false,
    "maxExamples": 5
  }
}
```

**Response:**
```json
{
  "analysis": {
    "purpose": "Script purpose description",
    "quality": {
      "score": 85,
      "issues": ["Issue 1", "Issue 2"],
      "recommendations": ["Recommendation 1"]
    },
    "security": {
      "score": 90,
      "vulnerabilities": [],
      "recommendations": []
    },
    "performance": {
      "score": 80,
      "bottlenecks": [],
      "optimizations": []
    }
  },
  "similarScripts": [],
  "documentation": "Generated documentation..."
}
```

#### POST /ai/please
Ask the AI assistant a PowerShell-related question.

**Request Body:**
```json
{
  "question": "string",
  "context": "string (optional)",
  "useAgent": true
}
```

**Response:**
```json
{
  "answer": "AI response...",
  "references": [],
  "examples": []
}
```

#### POST /ai-features/scripts/:id/documentation
Generate comprehensive documentation for a script.

**Response:**
```json
{
  "documentation": {
    "synopsis": "Brief description",
    "description": "Detailed description",
    "parameters": [],
    "examples": [],
    "notes": ""
  }
}
```

#### GET /ai-features/scripts/:id/refactor
Get refactoring suggestions for a script.

**Response:**
```json
{
  "suggestions": [
    {
      "type": "code_style",
      "description": "Use approved verbs",
      "original": "Function DoWork",
      "suggested": "Function Invoke-Work",
      "impact": "high"
    }
  ]
}
```

#### POST /ai-features/nl-to-script
Convert natural language description to PowerShell script.

**Request Body:**
```json
{
  "description": "Find all files larger than 1GB in C drive",
  "style": "verbose | concise",
  "includeErrorHandling": true
}
```

**Response:**
```json
{
  "script": "Get-ChildItem -Path C:\\ -Recurse...",
  "explanation": "This script searches...",
  "warnings": []
}
```

#### GET /ai-features/scripts/:id/security-scan
Perform comprehensive security analysis.

**Response:**
```json
{
  "securityScore": 85,
  "vulnerabilities": [
    {
      "severity": "medium",
      "type": "hardcoded_credential",
      "line": 15,
      "description": "Possible hardcoded password",
      "recommendation": "Use secure credential storage"
    }
  ],
  "compliance": {
    "cis": true,
    "nist": false
  }
}
```

#### POST /ai-features/scripts/:id/generate-tests
Generate Pester tests for a script.

**Request Body:**
```json
{
  "coverage": "basic | comprehensive",
  "includeEdgeCases": true
}
```

**Response:**
```json
{
  "tests": "Describe 'Get-SystemInfo' { ... }",
  "coverage": {
    "functions": 100,
    "parameters": 80,
    "errorHandling": 90
  }
}
```

#### POST /ai-features/explain-error
Get detailed explanation for PowerShell errors.

**Request Body:**
```json
{
  "error": "Cannot convert value...",
  "script": "Optional script context",
  "line": 42
}
```

**Response:**
```json
{
  "explanation": "This error occurs when...",
  "commonCauses": [],
  "solutions": [],
  "examples": []
}
```

#### POST /ai-features/scripts/:id/optimize
Optimize script for better performance.

**Response:**
```json
{
  "optimizedScript": "Optimized PowerShell code...",
  "improvements": [
    {
      "type": "pipeline_optimization",
      "description": "Use pipeline instead of foreach",
      "performanceGain": "50%"
    }
  ],
  "benchmarks": {
    "before": "5.2s",
    "after": "2.6s"
  }
}
```

### Search & Discovery

#### GET /search
Search scripts using various criteria.

**Query Parameters:**
- `q` (string): Search query
- `type` (string): Search type (content | name | description)
- `category` (string): Filter by category
- `tags` (array): Filter by tags
- `dateFrom` (date): Created after date
- `dateTo` (date): Created before date

**Response:** Array of matching scripts

#### GET /search/semantic
Perform semantic search using AI embeddings.

**Query Parameters:**
- `q` (string): Natural language search query
- `limit` (number): Maximum results
- `threshold` (number): Similarity threshold (0-1)

**Response:**
```json
{
  "results": [
    {
      "script": {},
      "similarity": 0.95,
      "explanation": "This script matches because..."
    }
  ]
}
```

### Analytics

#### GET /analytics/dashboard
Get dashboard statistics.

**Response:**
```json
{
  "totalScripts": 1523,
  "totalUsers": 45,
  "scriptsThisWeek": 23,
  "topCategories": [
    {"name": "System", "count": 234},
    {"name": "Network", "count": 189}
  ],
  "aiUsage": {
    "analyses": 456,
    "generations": 123,
    "optimizations": 78
  }
}
```

#### GET /analytics/scripts/:id/usage
Get usage statistics for a specific script.

**Response:**
```json
{
  "views": 234,
  "downloads": 56,
  "analyses": 12,
  "rating": 4.5,
  "usageHistory": [
    {"date": "2024-01-15", "views": 10, "downloads": 2}
  ]
}
```

## Error Handling

The API uses standard HTTP status codes:

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

Error Response Format:
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Detailed error message",
    "field": "Optional field name for validation errors"
  }
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authenticated users**: 1000 requests per hour
- **AI endpoints**: 100 requests per hour
- **File uploads**: 50 per hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## Webhooks

Configure webhooks to receive notifications about events:

### POST /webhooks
Create a new webhook.

**Request Body:**
```json
{
  "url": "https://your-domain.com/webhook",
  "events": ["script.created", "script.analyzed"],
  "secret": "optional-secret-for-validation"
}
```

### Webhook Events

- `script.created`: New script uploaded
- `script.updated`: Script modified
- `script.deleted`: Script removed
- `script.analyzed`: AI analysis completed
- `user.registered`: New user registration

## SDKs and Libraries

Official SDKs available for:

- **JavaScript/TypeScript**: `npm install @psscript/client`
- **Python**: `pip install psscript-client`
- **PowerShell**: `Install-Module PSScriptClient`

## Examples

### Complete Script Analysis Workflow

```bash
# 1. Login
TOKEN=$(curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123!"}' \
  | jq -r '.token')

# 2. Upload script
SCRIPT_ID=$(curl -X POST http://localhost:4000/api/scripts \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@script.ps1" \
  | jq -r '.id')

# 3. Analyze script
curl -X POST http://localhost:4000/api/ai/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"scriptId\":\"$SCRIPT_ID\",\"requestType\":\"detailed\"}"

# 4. Get optimization suggestions
curl -X POST http://localhost:4000/api/ai-features/scripts/$SCRIPT_ID/optimize \
  -H "Authorization: Bearer $TOKEN"
```

### PowerShell Client Example

```powershell
# Install the client module
Install-Module PSScriptClient

# Connect to the API
Connect-PSScript -Server "http://localhost:4000" -Credential (Get-Credential)

# Upload and analyze a script
$script = New-PSScriptUpload -Path ".\MyScript.ps1"
$analysis = Get-PSScriptAnalysis -Id $script.Id -Detailed

# Generate documentation
$docs = New-PSScriptDocumentation -Id $script.Id
$docs.documentation | Out-File ".\MyScript.md"
```

## Support

For API support:
- GitHub Issues: [github.com/psscript/issues](https://github.com/psscript/issues)
- API Status: [status.psscript.com](https://status.psscript.com)
- Email: api-support@psscript.com