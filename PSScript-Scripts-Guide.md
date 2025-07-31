# PSScript Manager Scripts Guide

This comprehensive guide details all available scripts in the PSScript Manager application, their purposes, and example usage.

## 🚀 Getting Started

### Installation

Install all dependencies for the entire project:

```bash
npm run install:all
```

This command installs dependencies for:
- Root project
- Frontend application
- Backend service

## 🔄 Development Scripts

### Main Development Command

Run all services in development mode simultaneously:

```bash
npm run dev
```

This command uses `concurrently` to start:
- Frontend development server
- Backend development server
- AI service with hot reloading

### Individual Service Development

Start just the frontend development server:

```bash
npm run frontend:dev
```

Start just the backend development server:

```bash
npm run backend:dev
```

Start just the AI service with hot reloading:

```bash
npm run ai:dev
```

## 🔨 Build Scripts

### Frontend Build

Build the frontend application for production:

```bash
cd src/frontend
npm run build
```

Build with type checking skipped (faster):

```bash
cd src/frontend
npm run build:prod
```

Preview the production build locally:

```bash
cd src/frontend
npm run preview
```

### Backend Build

Build the backend service for production:

```bash
cd src/backend
npm run build
```

Start the production backend server:

```bash
cd src/backend
npm run start
```

## 🧹 Linting

### All Linting Checks

Run all linting checks:

```bash
npm run lint
```

Fix linting issues automatically:

```bash
npm run lint:fix
```

### Backend Linting

Run backend linting only:

```bash
npm run lint:backend
```

Fix backend linting issues automatically:

```bash
npm run lint:backend:fix
```

### Frontend Linting

Run frontend linting only:

```bash
npm run lint:frontend
```

Fix frontend linting issues automatically:

```bash
npm run lint:frontend:fix
```

## 🔍 Database Testing

Test PostgreSQL connectivity:

```bash
cd src/backend
node test-db.js
```

Test Redis connectivity:

```bash
cd src/backend
node test-redis.js
```

Test results are logged to:
- `/test-results/db-tests/postgres-test.log`
- `/test-results/db-tests/redis-test.log`

## 📊 Project Structure

The project is organized into three main components:

### 1. Frontend (`src/frontend`)
- React-based UI for PowerShell script management
- Built with:
  - TypeScript
  - React
  - Material UI
  - Chart.js for visualizations
  - Monaco Editor for code editing

### 2. Backend (`src/backend`)
- Node.js/Express server providing API services
- Handles:
  - User authentication
  - PowerShell script execution
  - Database operations
  - API endpoints for script management

### 3. AI Service (`src/ai`)
- Python-based service for script analysis
- Features:
  - Multiple agent types (LangChain, AutoGPT, etc.)
  - PowerShell script analysis
  - Vector database integration
  - Voice agent capabilities

## 📝 Notes on Current ESLint Status

Issues reported by ESLint have been relaxed to warnings to allow the build to succeed. The following issues can be addressed in future updates:

### Backend
- Unused variables in various modules
- TypeScript @ts-nocheck directives without descriptions
- Use of require() instead of import statements
- ES2015 module syntax vs. namespaces

### Frontend 
- Unused variables and imports
- Potential React hook dependency issues
- Regular expression escape character issues
- Constant conditions in conditional expressions