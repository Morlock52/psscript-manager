# PSScript Technical Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Design](#architecture-design)
3. [Database Schema](#database-schema)
4. [API Specifications](#api-specifications)
5. [Security Implementation](#security-implementation)
6. [Performance Considerations](#performance-considerations)
7. [Deployment Architecture](#deployment-architecture)
8. [Development Guidelines](#development-guidelines)

## System Overview

PSScript is a comprehensive PowerShell Script Management Platform that combines modern web technologies with AI-powered analysis capabilities. The platform enables organizations to efficiently manage, analyze, and execute PowerShell scripts with enterprise-grade security and performance.

### Key Features
- **Script Repository Management**: Centralized storage and versioning of PowerShell scripts
- **AI-Powered Analysis**: Intelligent script analysis using OpenAI GPT models
- **Security Assessment**: Automated security scoring and vulnerability detection
- **User Management**: Role-based access control with authentication
- **Vector Search**: Semantic script search using pgvector embeddings
- **Real-time Chat**: AI assistant for PowerShell scripting help
- **Performance Monitoring**: Comprehensive logging and metrics collection

### Technology Stack

#### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **State Management**: TanStack Query v5 (React Query successor)
- **Routing**: React Router v6.31.0
- **UI Framework**: Material-UI (MUI) v6.4.8 + Tailwind CSS v3.5.2
- **Build Tool**: Vite v6.0.5 with automatic JSX runtime
- **Code Editor**: Monaco Editor for script editing
- **Charts**: Chart.js for analytics visualization

#### Backend
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express v5.1.0
- **ORM**: Sequelize v6.38.0 with PostgreSQL
- **Authentication**: JSON Web Tokens (JWT) v9.0.2
- **Security**: Helmet v8.0.0, CORS, Rate Limiting
- **Caching**: Redis v4.7.0 with IORedis v5.4.2
- **File Handling**: Multer for uploads, sanitization
- **Logging**: Winston v3.16.0 with daily rotation

#### AI Service
- **Framework**: FastAPI v0.115.6 with Pydantic v2.10.4
- **AI Integration**: OpenAI API v1.58.1+ with GPT-4
- **Vector Processing**: pgvector v0.3.6 for embeddings
- **Language Processing**: LangChain v0.3.11 for agent orchestration
- **Python Runtime**: Python 3.8+ with async/await support

#### Database & Cache
- **Primary Database**: PostgreSQL 15+ with pgvector extension
- **Cache Layer**: Redis 6.0+ for session and application caching
- **Vector Search**: pgvector for semantic script similarity
- **Connection Pooling**: Optimized pool configuration for high concurrency

#### Infrastructure
- **Containerization**: Docker with multi-stage builds
- **Orchestration**: Docker Compose for development
- **Reverse Proxy**: Nginx with security headers and rate limiting
- **Health Monitoring**: Built-in health checks and diagnostics

## Architecture Design

### System Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │      Nginx      │    │   SSL/TLS Term  │
│     (Optional)  │────│  Reverse Proxy  │────│   (Let's Encrypt)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                   ┌────────────┼────────────┐
                   │                         │
        ┌─────────────────┐         ┌─────────────────┐
        │   Frontend      │         │   Backend API   │
        │   React App     │         │   Express.js    │
        │   (Port 3002)   │         │   (Port 4000)   │
        └─────────────────┘         └─────────────────┘
                                             │
                   ┌─────────────────────────┼─────────────────────────┐
                   │                         │                         │
        ┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
        │   AI Service    │         │   PostgreSQL    │         │     Redis       │
        │   FastAPI       │         │   Database      │         │     Cache       │
        │   (Port 8000)   │         │   (Port 5432)   │         │   (Port 6379)   │
        └─────────────────┘         └─────────────────┘         └─────────────────┘
```

### Component Interactions

#### Data Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  Frontend   │────▶│   Backend   │────▶│  Database   │
│             │     │   (React)   │     │ (Express)   │     │(PostgreSQL) │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      ▲                     │                   │                   │
      │                     ▼                   ▼                   │
      │              ┌─────────────┐     ┌─────────────┐           │
      │              │   Cache     │     │ AI Service  │           │
      └──────────────│  (Redis)    │     │ (FastAPI)   │───────────┘
                     └─────────────┘     └─────────────┘
```

### Microservices Architecture

The application follows a microservices pattern with clear separation of concerns:

1. **Frontend Service**: React SPA serving the user interface
2. **Backend API Service**: Express.js REST API handling business logic
3. **AI Analysis Service**: FastAPI service for script analysis and AI features
4. **Database Service**: PostgreSQL with pgvector for data persistence
5. **Cache Service**: Redis for session management and performance optimization

### Security Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Security Layers                         │
├─────────────────────────────────────────────────────────────────┤
│ 1. Network Security (Nginx, Rate Limiting, DDoS Protection)    │
├─────────────────────────────────────────────────────────────────┤
│ 2. Application Security (CORS, CSP, Security Headers)          │
├─────────────────────────────────────────────────────────────────┤
│ 3. Authentication & Authorization (JWT, Role-based Access)     │
├─────────────────────────────────────────────────────────────────┤
│ 4. Data Security (Input Validation, SQL Injection Prevention)  │
├─────────────────────────────────────────────────────────────────┤
│ 5. Infrastructure Security (Container Security, SSL/TLS)       │
└─────────────────────────────────────────────────────────────────┘
```

## Database Schema

### Entity Relationship Diagram

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│    Users    │      │  Categories │      │    Tags     │
├─────────────┤      ├─────────────┤      ├─────────────┤
│ id (PK)     │      │ id (PK)     │      │ id (PK)     │
│ username    │      │ name        │      │ name        │
│ email       │      │ description │      │ created_at  │
│ password    │      │ created_at  │      └─────────────┘
│ role        │      │ updated_at  │             │
│ created_at  │      └─────────────┘             │
│ updated_at  │             │                    │
└─────────────┘             │                    │
       │                    │                    │
       │    ┌─────────────────────────┐          │
       └───▶│       Scripts         │◀─────────┐ │
            ├─────────────────────────┤         │ │
            │ id (PK)                 │         │ │
            │ title                   │         │ │
            │ description             │         │ │
            │ content                 │         │ │
            │ user_id (FK)            │─────────┘ │
            │ category_id (FK)        │───────────┘
            │ file_hash               │
            │ version                 │
            │ is_public               │
            │ created_at              │
            │ updated_at              │
            └─────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       │               │               │
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ScriptAnalysis│ │ScriptVersions│ │ScriptTags   │
├─────────────┤ ├─────────────┤ ├─────────────┤
│ id (PK)     │ │ id (PK)     │ │ script_id   │
│ script_id   │ │ script_id   │ │ tag_id      │
│ purpose     │ │ content     │ └─────────────┘
│ security    │ │ version     │
│ quality     │ │ user_id     │
│ risk_score  │ │ created_at  │
│ created_at  │ └─────────────┘
└─────────────┘
```

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Scripts Table
```sql
CREATE TABLE scripts (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    category_id INTEGER REFERENCES categories(id),
    file_hash TEXT UNIQUE,
    version INTEGER NOT NULL DEFAULT 1,
    is_public BOOLEAN NOT NULL DEFAULT false,
    execution_count INTEGER NOT NULL DEFAULT 0,
    average_execution_time FLOAT,
    last_executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Script Analysis Table
```sql
CREATE TABLE script_analysis (
    id SERIAL PRIMARY KEY,
    script_id INTEGER REFERENCES scripts(id) ON DELETE CASCADE,
    purpose TEXT,
    security_score FLOAT,
    quality_score FLOAT,
    risk_score FLOAT,
    parameter_docs JSONB,
    suggestions JSONB,
    command_details JSONB DEFAULT '[]'::jsonb,
    ms_docs_references JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Vector Embeddings Table
```sql
CREATE TABLE script_embeddings (
    id SERIAL PRIMARY KEY,
    script_id INTEGER REFERENCES scripts(id) ON DELETE CASCADE UNIQUE,
    embedding vector(1536),  -- OpenAI embedding dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Indexes and Performance Optimization

```sql
-- Core indexes for performance
CREATE INDEX idx_scripts_category ON scripts(category_id);
CREATE INDEX idx_scripts_user ON scripts(user_id);
CREATE INDEX idx_script_analysis_script ON script_analysis(script_id);

-- Vector similarity search index
CREATE INDEX script_embeddings_idx ON script_embeddings 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Text search indexes
CREATE INDEX idx_scripts_title_search ON scripts USING gin(to_tsvector('english', title));
CREATE INDEX idx_scripts_content_search ON scripts USING gin(to_tsvector('english', content));
```

## API Specifications

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user and return JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "johndoe",
    "email": "user@example.com",
    "role": "user",
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

#### POST /api/auth/register
Register new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "user@example.com", 
  "password": "securepassword"
}
```

### Script Management Endpoints

#### GET /api/scripts
Retrieve paginated list of scripts.

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)
- `category`: Filter by category ID
- `search`: Search term for title/content
- `user`: Filter by user ID

**Response:**
```json
{
  "scripts": [
    {
      "id": 1,
      "title": "System Health Check",
      "description": "Comprehensive system diagnostics",
      "user": {
        "id": 1,
        "username": "admin"
      },
      "category": {
        "id": 8,
        "name": "Monitoring & Diagnostics"
      },
      "version": 1,
      "is_public": true,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 5,
    "total_items": 100,
    "items_per_page": 20
  }
}
```

#### POST /api/scripts
Upload new PowerShell script.

**Request Body (multipart/form-data):**
- `file`: PowerShell script file (.ps1)
- `title`: Script title
- `description`: Script description
- `category_id`: Category ID
- `is_public`: Boolean (default: false)

#### GET /api/scripts/:id
Get specific script with detailed information.

#### PUT /api/scripts/:id
Update existing script (requires ownership or admin role).

#### DELETE /api/scripts/:id
Delete script (requires ownership or admin role).

### AI Analysis Endpoints

#### POST /api/scripts/:id/analyze
Analyze PowerShell script using AI.

**Request Body:**
```json
{
  "include_command_details": true,
  "fetch_ms_docs": true
}
```

**Response:**
```json
{
  "purpose": "This script performs system health diagnostics",
  "security_analysis": "Script appears safe with no suspicious activities",
  "security_score": 8.5,
  "code_quality_score": 9.0,
  "risk_score": 2.1,
  "category": "Monitoring & Diagnostics",
  "parameters": {
    "ComputerName": {
      "type": "string",
      "description": "Target computer name",
      "mandatory": false
    }
  },
  "command_details": [
    {
      "command": "Get-WmiObject",
      "description": "Retrieves management information",
      "security_notes": "Generally safe for system queries"
    }
  ],
  "optimization": [
    "Consider adding error handling for WMI calls",
    "Add parameter validation"
  ]
}
```

#### POST /api/scripts/similar
Find similar scripts using vector search.

**Request Body:**
```json
{
  "script_id": 123,
  "limit": 5
}
```

### User Management Endpoints

#### GET /api/users/me
Get current user profile.

#### PUT /api/users/me
Update current user profile.

#### GET /api/users (Admin only)
List all users with pagination.

#### POST /api/users (Admin only)
Create new user account.

### Analytics Endpoints

#### GET /api/analytics/dashboard
Get dashboard statistics.

**Response:**
```json
{
  "total_scripts": 1250,
  "total_users": 45,
  "analysis_completed": 1100,
  "categories": [
    {
      "name": "System Administration",
      "count": 320
    }
  ],
  "recent_activity": [
    {
      "action": "script_uploaded",
      "user": "johndoe",
      "timestamp": "2025-01-01T12:00:00Z"
    }
  ]
}
```

### Health Check Endpoints

#### GET /api/health
System health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00Z",
  "services": {
    "database": {
      "status": "connected",
      "response_time": 15
    },
    "redis": {
      "status": "connected", 
      "response_time": 2
    },
    "ai_service": {
      "status": "available",
      "response_time": 120
    }
  }
}
```

## Security Implementation

### Authentication & Authorization

#### JWT Token Structure
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user_id",
    "username": "johndoe",
    "role": "user",
    "iat": 1640995200,
    "exp": 1641081600
  }
}
```

#### Role-Based Access Control
- **Admin**: Full system access, user management, all scripts
- **User**: Personal scripts, public scripts, analysis features
- **Guest**: Read-only access to public scripts (if enabled)

### Security Headers Configuration

```javascript
// Helmet.js configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
```

### Input Validation & Sanitization

```javascript
// Express Validator middleware
const scriptValidation = [
  body('title')
    .isLength({ min: 1, max: 255 })
    .withMessage('Title must be 1-255 characters'),
  body('content')
    .custom((value) => {
      // PowerShell script validation
      if (!value || typeof value !== 'string') {
        throw new Error('Script content is required');
      }
      // Additional PowerShell syntax validation
      return true;
    }),
  body('category_id')
    .isInt({ min: 1 })
    .withMessage('Valid category ID required')
];
```

### Rate Limiting Configuration

```javascript
// API rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

// Auth endpoints stricter limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts'
});
```

## Performance Considerations

### Database Optimization

#### Connection Pooling
```javascript
const sequelize = new Sequelize(config, {
  pool: {
    max: 20,     // Maximum connections
    min: 5,      // Minimum connections
    acquire: 60000,  // Maximum time to get connection
    idle: 10000,     // Maximum idle time
    evict: 1000      // Eviction run interval
  }
});
```

#### Query Optimization
- Use indexes for frequently queried columns
- Implement pagination for large result sets
- Use database-level filtering instead of application filtering
- Optimize vector similarity searches with proper indexing

### Caching Strategy

#### Redis Caching Layers
1. **Session Cache**: User sessions and authentication tokens
2. **API Response Cache**: Frequently accessed API responses
3. **Analysis Cache**: Expensive AI analysis results
4. **Search Cache**: Popular search queries and results

#### Cache TTL Configuration
```javascript
const cacheTTL = {
  session: 3600,        // 1 hour
  apiResponse: 300,     // 5 minutes
  analysis: 86400,      // 24 hours
  search: 1800          // 30 minutes
};
```

### Frontend Optimization

#### Code Splitting & Lazy Loading
```typescript
// Route-based code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ScriptManagement = lazy(() => import('./pages/ScriptManagement'));
const AgenticAI = lazy(() => import('./pages/AgenticAIPage'));

// Component lazy loading
const LazyAnalysisPanel = lazy(() => import('./components/AIAnalysisPanel'));
```

#### Bundle Optimization
```javascript
// Vite configuration for optimal bundling
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@mui/material', '@mui/icons-material'],
          query: ['@tanstack/react-query']
        }
      }
    }
  }
});
```

## Deployment Architecture

### Container Configuration

#### Production Dockerfile (Backend)
```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine as build
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
USER nodejs
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/api/health || exit 1
EXPOSE 4000
CMD ["node", "dist/index.js"]
```

#### Docker Compose (Production)
```yaml
version: '3.8'
services:
  frontend:
    build:
      context: ./src/frontend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
    depends_on:
      - backend
    
  backend:
    build:
      context: ./src/backend
      dockerfile: Dockerfile.prod
    environment:
      - NODE_ENV=production
      - DB_HOST=postgres
      - REDIS_HOST=redis
    depends_on:
      - postgres
      - redis
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
```

### Environment-Specific Configurations

#### Development Environment
- Hot module replacement enabled
- Detailed error logging
- Development database with sample data
- Mock services for external APIs

#### Staging Environment
- Production-like configuration
- SSL certificates (staging)
- Monitoring and alerting
- Automated testing deployment

#### Production Environment
- Optimized builds and images
- SSL/TLS encryption
- Comprehensive monitoring
- Automated backups and recovery

## Development Guidelines

### Code Style and Standards

#### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": false,
    "declaration": true,
    "outDir": "./dist"
  }
}
```

#### ESLint Configuration
```javascript
export default [
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  }
];
```

### Testing Strategy

#### Unit Testing
- **Frontend**: Jest + React Testing Library
- **Backend**: Jest + Supertest for API testing
- **AI Service**: pytest for Python components

#### Integration Testing
- API endpoint testing with real database
- Database migration testing
- Cache integration testing

#### End-to-End Testing
- Playwright for browser automation
- Critical user journey testing
- Cross-browser compatibility testing

### Git Workflow

#### Branch Strategy
- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual feature development
- `hotfix/*`: Critical production fixes

#### Commit Convention
```
type(scope): description

feat(auth): add JWT token refresh mechanism
fix(api): resolve script upload validation error
docs(readme): update installation instructions
refactor(cache): optimize Redis connection handling
```

### Performance Monitoring

#### Key Metrics
- **Response Time**: API endpoint response times
- **Throughput**: Requests per second
- **Error Rate**: 4xx/5xx error percentage
- **Database Performance**: Query execution times
- **Cache Hit Rate**: Redis cache effectiveness

#### Monitoring Tools
- Application logs with structured logging
- Health check endpoints for all services
- Database query performance monitoring
- Container resource usage tracking

---

This technical documentation provides a comprehensive overview of the PSScript platform architecture, implementation details, and operational guidelines. For specific implementation examples and code samples, refer to the source code repository and additional documentation files.