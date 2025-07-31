// This service handles fetching the README content
// In a real application, this would fetch from an API endpoint
// For this demo, we'll use a static, enhanced README

export const getReadmeContent = async (): Promise<string> => {
  try {
    // In a real app, fetch from backend
    // const response = await fetch('/api/readme');
    // return await response.text();
    
    // For demo purposes, return an enhanced README with detailed information
    return `# PowerShell Script Management Application

A comprehensive platform for managing, analyzing, and executing PowerShell scripts with AI-enhanced capabilities for enterprise environments.

![PS Script Manager](https://example.com/screenshots/dashboard.png)

## 🚀 Features

### Core Capabilities
- **AI-Powered Analysis**: Automatically analyzes scripts to detect security risks, assess code quality, and identify potential improvements using state-of-the-art LLMs
- **Semantic Search**: Find scripts by natural language queries like "scripts that manage Active Directory users" or "backup scripts with encryption"
- **Script Repository**: Centralized storage with version control, tagging, and categorization
- **Secure Execution**: Run scripts with parameter validation in isolated environments with configurable permission boundaries
- **Advanced Visualization**: Interactive dashboards for script performance metrics and code quality trends

### Enterprise-Ready
- **Role-Based Access Control**: Granular permissions for authors, reviewers, administrators, and execution-only users
- **Compliance Tracking**: Audit trails for all script executions and modifications with detailed logs
- **Multi-Environment Support**: Test scripts across development, staging, and production environments
- **Integration Capabilities**: REST API for integration with CI/CD pipelines, ITSM tools, and monitoring systems
- **SSO Authentication**: Support for enterprise authentication via SAML, OIDC, and Active Directory

### Technical Excellence
- **Vector Embeddings**: pgvector-powered semantic search for finding functionally similar scripts
- **High Performance**: Redis caching and optimized database queries for sub-second response times
- **Multi-Model AI**: Support for OpenAI, Anthropic, Mistral and open-source models with configurable optimization targets
- **Responsive UI**: Modern interface built with React that works seamlessly across desktop and mobile devices
- **Theme Support**: Professional dark and light themes with customization options

## 📋 Prerequisites

- **Docker & Docker Compose**: v20.10+ and Compose v2.0+
- **Node.js**: v16.0+ (v18+ recommended) with npm v7.0+
- **Python**: 3.9+ with pip and venv
- **API Keys**: OpenAI or compatible LLM provider API key
- **Database**: PostgreSQL 14+ with pgvector extension installed
- **System Resources**: At least 5GB free disk space, 4GB RAM, and 2 CPU cores

## 🛠️ Installation

### Option 1: Docker Deployment (Recommended)

1. **Clone the repository**:
   \`\`\`bash
   git clone https://github.com/enterprise/psscript-manager.git
   cd psscript-manager
   \`\`\`

2. **Configure environment**:
   \`\`\`bash
   cp .env.example .env
   
   # Edit .env and set these required variables:
   # - OPENAI_API_KEY or ANTHROPIC_API_KEY
   # - JWT_SECRET (use: openssl rand -hex 32)
   # - POSTGRES_PASSWORD (strong database password)
   \`\`\`

3. **Start the application stack**:
   \`\`\`bash
   docker-compose up -d
   
   # Verify all services are running
   docker-compose ps
   \`\`\`

4. **Access the application**:
   - Frontend UI: [http://localhost:3000](http://localhost:3000)
   - API Documentation: [http://localhost:4001/api-docs](http://localhost:4001/api-docs)
   - Monitoring Dashboard: [http://localhost:8080](http://localhost:8080)

   Default administrator login:
   - Username: \`admin@example.com\`
   - Password: \`P@ssw0rd-ch4nge-me!\` (change immediately after first login)

### Option 2: Development Setup

1. **Clone and initialize**:
   \`\`\`bash
   git clone https://github.com/enterprise/psscript-manager.git
   cd psscript-manager
   ./setup.sh --dev
   \`\`\`

2. **Start the PostgreSQL and Redis services**:
   \`\`\`bash
   docker-compose up -d postgres redis
   \`\`\`

3. **Start the frontend development server**:
   \`\`\`bash
   cd src/frontend
   npm run dev
   
   # The UI will be available at http://localhost:3000 with hot reloading
   \`\`\`

4. **Start the backend API server**:
   \`\`\`bash
   cd src/backend
   npm run dev
   
   # The API will be available at http://localhost:4001
   \`\`\`

5. **Start the AI analysis service**:
   \`\`\`bash
   cd src/ai
   source venv/bin/activate  # On Windows: .\\venv\\Scripts\\activate
   python -m uvicorn main:app --reload
   
   # The AI service will be available at http://localhost:8000
   \`\`\`

## 📚 Project Structure

\`\`\`
psscript-manager/
├── docker-compose.yml           # Container orchestration config
├── .env.example                 # Environment variable template
├── setup.sh                     # Automated setup script
├── docs/                        # Documentation files
│   ├── api/                     # API documentation
│   ├── architecture/            # System design documents
│   ├── deployment/              # Deployment guides
│   └── user-guides/             # End-user documentation
├── src/
│   ├── frontend/                # React/TypeScript UI
│   │   ├── components/          # Reusable UI components
│   │   │   ├── common/          # Shared components like buttons, cards
│   │   │   ├── layout/          # Layout components
│   │   │   └── scripts/         # Script-specific components
│   │   ├── pages/               # Application pages
│   │   ├── services/            # API service layer
│   │   ├── hooks/               # Custom React hooks
│   │   ├── utils/               # Helper functions
│   │   └── tests/               # Frontend unit tests
│   ├── backend/                 # Node.js/Express API
│   │   ├── controllers/         # Request handlers
│   │   ├── middleware/          # Express middleware
│   │   ├── models/              # Database models
│   │   ├── routes/              # API routes
│   │   ├── services/            # Business logic
│   │   ├── utils/               # Helper utilities
│   │   └── tests/               # Backend unit tests
│   ├── ai/                      # Python AI service
│   │   ├── analysis/            # Script analysis logic
│   │   │   ├── security.py      # Security analysis module
│   │   │   ├── quality.py       # Code quality assessment
│   │   │   └── insights.py      # Script insights generator
│   │   ├── embeddings/          # Vector embedding generation
│   │   ├── models/              # Model configuration and adapters
│   │   ├── tests/               # AI service tests
│   │   └── main.py              # FastAPI application
│   ├── db/                      # Database
│   │   ├── migrations/          # Database migrations
│   │   ├── schema.sql           # Database schema
│   │   └── seeds/               # Seed data
│   └── powershell/              # PowerShell modules
│       ├── modules/             # Custom PowerShell modules
│       └── integrations/        # Integration scripts
└── tests/                       # End-to-end and integration tests
\`\`\`

## 🧠 AI Capabilities

The application leverages advanced AI models to enhance PowerShell script management:

### 1. Code Analysis Features

| Feature | Description | Example |
|---------|-------------|---------|
| **Quality Assessment** | Evaluates script quality on a 1-10 scale based on best practices | "Your script scores 8.5/10. Strengths: modular design, error handling. Improvements: add parameter validation." |
| **Security Analysis** | Identifies security issues like hardcoded credentials or unsafe execution | "Security risk detected: Plain-text password on line 42. Recommendation: Use SecureString or credential store." |
| **Purpose Identification** | Determines script functionality and use cases | "This script performs Active Directory user account provisioning with group assignment and mailbox creation." |
| **Parameter Documentation** | Auto-generates documentation for script parameters | "Parameter: -UserList (Mandatory). Type: String[]. Description: Array of user email addresses to process." |
| **Performance Optimization** | Suggests improvements for execution speed | "Replace ForEach loop with more efficient pipeline processing to improve execution speed by ~40%." |

### 2. Vector Search Capabilities

The application uses advanced vector embeddings to enable powerful semantic search:

\`\`\`powershell
# Example: Finding similar scripts

# Original script fragment
$users = Get-ADUser -Filter {Department -eq "Sales"} -Properties Department
foreach ($user in $users) {
    Add-ADGroupMember -Identity "SalesTeam" -Members $user
}

# Semantic search finds functionally similar scripts, even with different syntax:
$salesUsers = Get-ADUser -Filter "Department -like 'Sales*'" 
Add-ADGroupMember -Identity "SalesReports" -Members $salesUsers
\`\`\`

### 3. Supported AI Models

The application supports multiple AI models with different capabilities and cost profiles:

| Model | Provider | Strengths | Best For |
|-------|----------|-----------|----------|
| GPT-4o | OpenAI | High accuracy with fast processing | General script analysis |
| Claude 3.5 Sonnet | Anthropic | Superior reasoning, edge case detection | Security-critical assessment |
| Mistral Large | Mistral AI | Good accuracy with lower cost | Batch processing many scripts |
| Llama 3 70B | Meta | Self-hosted option, no data sharing | Airgapped environments |

## 💡 Use Cases & Examples

### Example 1: Security Hardening

Before AI Analysis:
\`\`\`powershell
# Connect to Exchange Online
$username = "admin@contoso.com"
$password = "PlainTextPassword123!"
$securePassword = ConvertTo-SecureString $password -AsPlainText -Force
$credentials = New-Object System.Management.Automation.PSCredential ($username, $securePassword)
Connect-ExchangeOnline -Credential $credentials
\`\`\`

After AI Analysis and Recommendations:
\`\`\`powershell
# Connect to Exchange Online securely
# Credential stored securely, prompting user interactively if not found
if (-not (Test-Path -Path "\\\\secureserver\\creds\\exchangeCredential.xml")) {
    $credentials = Get-Credential -Message "Enter Exchange Online credentials"
    $credentials | Export-Clixml -Path "\\\\secureserver\\creds\\exchangeCredential.xml"
} else {
    $credentials = Import-Clixml -Path "\\\\secureserver\\creds\\exchangeCredential.xml"
}

# Use modern authentication
Connect-ExchangeOnline -UserPrincipalName $credentials.UserName -UseModernAuth
\`\`\`

### Example 2: Performance Optimization

Before AI Analysis:
\`\`\`powershell
$computers = Get-ADComputer -Filter * | Select-Object -ExpandProperty Name
$results = @()

foreach ($computer in $computers) {
    $os = Get-WmiObject -ComputerName $computer -Class Win32_OperatingSystem
    $processor = Get-WmiObject -ComputerName $computer -Class Win32_Processor
    $system = Get-WmiObject -ComputerName $computer -Class Win32_ComputerSystem
    
    $info = New-Object PSObject -Property @{
        ComputerName = $computer
        OSVersion = $os.Version
        OSBuild = $os.BuildNumber
        ProcessorName = $processor.Name
        Memory = [math]::Round($system.TotalPhysicalMemory / 1GB, 2)
    }
    
    $results += $info
}

$results | Export-Csv -Path "SystemInventory.csv" -NoTypeInformation
\`\`\`

After AI Optimization:
\`\`\`powershell
$computers = Get-ADComputer -Filter * -Properties Name | Select-Object -ExpandProperty Name

# Use parallel processing for better performance
$results = $computers | ForEach-Object -Parallel {
    $computer = $_
    try {
        $session = New-CimSession -ComputerName $computer -ErrorAction Stop
        $os = Get-CimInstance -ClassName Win32_OperatingSystem -CimSession $session
        $processor = Get-CimInstance -ClassName Win32_Processor -CimSession $session
        $system = Get-CimInstance -ClassName Win32_ComputerSystem -CimSession $session
        
        [PSCustomObject]@{
            ComputerName = $computer
            OSVersion = $os.Version
            OSBuild = $os.BuildNumber
            ProcessorName = $processor.Name
            Memory = [math]::Round($system.TotalPhysicalMemory / 1GB, 2)
            Status = "Success"
        }
        
        Remove-CimSession -CimSession $session
    } catch {
        [PSCustomObject]@{
            ComputerName = $computer
            Status = "Failed: $($_.Exception.Message)"
        }
    }
} -ThrottleLimit 20

$results | Export-Csv -Path "SystemInventory.csv" -NoTypeInformation
\`\`\`

## 🔌 API Reference

The application provides a comprehensive REST API for integration with other systems:

### Authentication Endpoints

| Method | Endpoint | Description | Example Request |
|--------|----------|-------------|----------------|
| POST   | \`/api/auth/register\` | Register a new user | \`{"username": "jsmith", "email": "jsmith@example.com", "password": "secure-pw", "role": "author"}\` |
| POST   | \`/api/auth/login\` | Log in and get authentication token | \`{"email": "jsmith@example.com", "password": "secure-pw"}\` |
| POST   | \`/api/auth/refresh\` | Refresh authentication token | \`{"refreshToken": "eyJhbGci..."}\` |
| GET    | \`/api/auth/me\` | Get current user information | Requires Authorization header |
| POST   | \`/api/auth/logout\` | Invalidate current tokens | Requires Authorization header |

### Script Management Endpoints

| Method | Endpoint | Description | Example |
|--------|----------|-------------|---------|
| GET    | \`/api/scripts\` | List scripts with optional filters | \`/api/scripts?category=Security&limit=20&page=1\` |
| GET    | \`/api/scripts/:id\` | Get a specific script by ID | \`/api/scripts/42\` |
| POST   | \`/api/scripts\` | Create a new script | \`{"title": "AD User Creation", "content": "# Script content", "category_id": 3}\` |
| PUT    | \`/api/scripts/:id\` | Update an existing script | \`{"content": "# Updated content", "version_message": "Fix bug in error handling"}\` |
| DELETE | \`/api/scripts/:id\` | Delete a script | \`/api/scripts/42\` |
| GET    | \`/api/scripts/search\` | Search scripts by text or semantic query | \`/api/scripts/search?q=active directory user provisioning\` |
| POST   | \`/api/scripts/:id/execute\` | Execute a script with parameters | \`{"params": {"UserName": "jdoe", "Department": "IT"}}\` |
| GET    | \`/api/scripts/:id/analysis\` | Get AI analysis for a script | \`/api/scripts/42/analysis\` |
| GET    | \`/api/scripts/:id/history\` | Get version history for a script | \`/api/scripts/42/history\` |
| GET    | \`/api/scripts/:id/similar\` | Find semantically similar scripts | \`/api/scripts/42/similar?limit=5\` |

### Management & Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | \`/api/categories\` | List all script categories |
| GET    | \`/api/tags\` | List available tags |
| POST   | \`/api/tags\` | Create a new tag |
| GET    | \`/api/analytics/usage\` | Get script usage statistics |
| GET    | \`/api/analytics/security\` | Get security metrics |
| GET    | \`/api/admin/users\` | List all users (admin only) |
| PUT    | \`/api/admin/users/:id\` | Update user roles (admin only) |

## 🖥️ Environment Variables

The application is configured using environment variables:

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| \`NODE_ENV\` | Environment (development/production) | development | No |
| \`PORT\` | Backend API port | 4001 | No |
| \`DB_HOST\` | PostgreSQL database host | postgres | No |
| \`DB_PORT\` | PostgreSQL database port | 5432 | No |
| \`DB_NAME\` | PostgreSQL database name | psscript | No |
| \`DB_USER\` | PostgreSQL username | postgres | No |
| \`DB_PASSWORD\` | PostgreSQL password | | Yes |
| \`REDIS_URL\` | Redis connection URL | redis://redis:6379 | No |
| \`JWT_SECRET\` | Secret for JWT tokens | | Yes |
| \`JWT_EXPIRY\` | JWT token expiration time | 1h | No |
| \`JWT_REFRESH_EXPIRY\` | JWT refresh token expiration | 7d | No |
| \`OPENAI_API_KEY\` | OpenAI API key | | Yes* |
| \`ANTHROPIC_API_KEY\` | Anthropic API key | | No* |
| \`MISTRAL_API_KEY\` | Mistral API key | | No* |
| \`AI_MODEL\` | Default AI model | gpt-4o | No |
| \`AI_SERVICE_URL\` | URL for the AI service | http://ai-service:8000 | No |
| \`LOG_LEVEL\` | Logging level | info | No |
| \`CORS_ORIGIN\` | CORS allowed origins | http://localhost:3000 | No |

*At least one of the AI provider API keys is required.

## 🛡️ Security Features

The application implements comprehensive security measures:

### Authentication & Authorization
- **JWT-based Authentication**: Secure, expiring JSON Web Tokens with refresh token rotation
- **Role-Based Access Control**: Granular permissions for viewing, creating, editing, and executing scripts
- **API Key Authentication**: For programmatic access from CI/CD pipelines or automation tools

### Data Protection
- **Password Security**: Bcrypt hashing with adaptive cost factors for password storage
- **Secret Detection**: Automated detection of credentials, API keys, and other secrets in scripts
- **Data Encryption**: Encryption of sensitive data at rest and in transit
- **Audit Logging**: Comprehensive logging of all security-relevant events

### API Security
- **Rate Limiting**: Protection against brute force and DoS attacks
- **CORS Protection**: Configurable cross-origin resource sharing
- **Input Validation**: Strict validation of all API inputs
- **Security Headers**: Implementation of recommended security headers
- **CSRF Protection**: Cross-site request forgery prevention measures

### Script Execution Security
- **Sandboxed Execution**: Isolated environments for script execution
- **Parameter Validation**: Strict type checking and validation of script parameters
- **Privilege Limitations**: Configurable execution boundaries and permission restrictions
- **Resource Quotas**: CPU, memory, and time limits for script execution

## 🔧 Troubleshooting

### Common Issues and Solutions

#### Database Connection Issues
\`\`\`
ERROR: connection to database failed: could not connect to server: Connection refused
\`\`\`
**Solution**: 
- Verify PostgreSQL is running: \`docker-compose ps postgres\`
- Check database credentials in .env file
- Ensure database port is not blocked by firewall

#### AI Analysis Not Working
\`\`\`
ERROR: OpenAI API request failed: 401 - Invalid API key provided
\`\`\`
**Solution**:
- Verify your API key in the .env file
- Check API key permissions and quota limits
- Try an alternative AI provider (Anthropic, Mistral, etc.)

#### Script Execution Timeouts
\`\`\`
ERROR: Script execution timed out after 60 seconds
\`\`\`
**Solution**:
- Increase timeout in Application Settings
- Optimize script performance
- Consider breaking large scripts into smaller, modular components

### Development Mode Utilities

#### Switching Between Mock and Production Database
- Enable this feature in Application Settings (Settings > Application Settings > Database Toggle Button)
- Once enabled, a floating toggle button appears at the bottom-right corner
- Mock data is useful for UI development without API dependencies
- Green indicator shows production database, yellow shows mock data

#### Viewing README Documentation
- Access the formatted project documentation via Settings > Application Information > View README Documentation
- Documentation includes API details, features, and troubleshooting guides

## 📊 Performance Considerations

### Optimization Guidelines
- For large script repositories (1000+ scripts), enable Redis caching
- Vector search operations are CPU-intensive; consider GPU acceleration for large deployments
- Batch analysis of scripts should be scheduled during off-peak hours
- Database indexes are optimized for script title and content searches

### Scaling Recommendations
- Horizontal scaling: Add multiple API nodes behind a load balancer
- Vertical scaling: Increase resources for PostgreSQL (particularly important for vector operations)
- Consider read replicas for database in high-read environments

## 📄 License

This project is licensed under the MIT License.

Copyright © 2025 PowerShell Script Manager Team

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;
  } catch (error) {
    console.error("Failed to fetch README:", error);
    return "# Error Loading README\n\nPlease try again later.";
  }
};
