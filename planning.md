# PSScript Manager - Project Plan

## 1. Introduction

PSScript Manager is a web application designed for managing PowerShell scripts, providing features like storage, AI-powered analysis, vector-based similarity search, secure execution, and voice interaction capabilities. It utilizes a microservices architecture containerized with Docker.

## 2. Architecture Overview

The application follows a microservices pattern, separating concerns into distinct services managed within an npm workspace monorepo.

```mermaid
graph TD
    subgraph User Browser
        Frontend[React Frontend]
    end

    subgraph Server Infrastructure
        Nginx[Nginx Reverse Proxy (Prod)] -->|Requests| Frontend
        Nginx -->|/api| Backend
        Nginx -->|/ai| AIService

        subgraph Backend Services
            Backend[Node.js/Express Backend API]
            AIService[Python/FastAPI AI Service]
            Executor[Node.js PowerShell Executor]
        end

        subgraph Data Stores
            Postgres[PostgreSQL + pgvector]
            Redis[Redis Cache]
        end

        Frontend -->|HTTP API Calls| Backend
        Backend -->|Analysis Req| AIService
        Backend -->|Execution Req| Executor
        Backend -->|DB Operations| Postgres
        Backend -->|Cache Ops| Redis
        AIService -->|DB Operations| Postgres
        AIService -->|External AI APIs| OpenAI[OpenAI/Cloud AI]
        AIService -->|Voice APIs| VoiceServices[Cloud Voice Services]
    end

    style Nginx fill:#f9f,stroke:#333,stroke-width:2px
    style Frontend fill:#ccf,stroke:#333,stroke-width:2px
    style Backend fill:#cfc,stroke:#333,stroke-width:2px
    style AIService fill:#fcf,stroke:#333,stroke-width:2px
    style Executor fill:#ffc,stroke:#333,stroke-width:2px
    style Postgres fill:#cff,stroke:#333,stroke-width:2px
    style Redis fill:#fcc,stroke:#333,stroke-width:2px
```

## 3. Component Details

*   **Frontend (`src/frontend`):**
    *   **Stack:** React, TypeScript, Vite, Material UI, Tailwind CSS, Axios, React Query.
    *   **Purpose:** Provides the user interface for interacting with the application, managing scripts, viewing analysis, and triggering actions.
*   **Backend (`src/backend`):**
    *   **Stack:** Node.js, TypeScript, Express, Sequelize (ORM), PostgreSQL (pg, pgvector), Redis (ioredis), JWT.
    *   **Purpose:** Handles core business logic, API requests, user authentication, script metadata management, interaction with the database and cache, and coordination with AI and Executor services.
*   **AI Service (`src/ai`):**
    *   **Stack:** Python, FastAPI, Uvicorn, Langchain, OpenAI SDK, pgvector, Redis, various voice SDKs (Google, AWS, Azure).
    *   **Purpose:** Performs AI-driven script analysis, generates vector embeddings for similarity search, handles chat interactions, and manages voice input/output processing.
*   **Executor Service (`src/executor`):**
    *   **Stack:** Node.js, `node-powershell`.
    *   **Purpose:** Provides a secure environment for executing PowerShell scripts, isolated from the main backend service. Receives execution requests via an internal API.
*   **Database (`postgres` service):**
    *   **Technology:** PostgreSQL with the `pgvector` extension.
    *   **Purpose:** Stores user data, script metadata, analysis results, vector embeddings, chat history, and other persistent application data.
*   **Cache (`redis` service):**
    *   **Technology:** Redis.
    *   **Purpose:** Used for session management, caching frequently accessed data, and potentially managing background job queues.

## 4. Data Flow Examples

*   **Script Upload & Analysis:** User uploads script via Frontend -> Backend receives file, stores metadata in Postgres, saves file -> Backend requests analysis from AI Service -> AI Service analyzes, generates embedding, stores results/embedding in Postgres -> Backend updates script status.
*   **Script Execution:** User requests execution via Frontend -> Backend validates request -> Backend sends script content and parameters to Executor Service -> Executor Service runs the script securely -> Executor Service returns results/output to Backend -> Backend returns results to Frontend.
*   **Voice Interaction:** User speaks via Frontend -> Frontend sends audio to AI Service -> AI Service transcribes audio (using Cloud Voice API) -> AI Service processes command (potentially interacting with Backend) -> AI Service generates text response -> AI Service synthesizes speech (using Cloud Voice API) -> AI Service sends audio back to Frontend -> Frontend plays audio.

## 5. Deployment Strategy

*   **Containerization:** All services are containerized using Docker.
*   **Orchestration:** Docker Compose is used for defining and running the multi-container application.
*   **Environments:**
    *   **Development:** Uses `docker-compose.yml` potentially overridden by `docker-compose.override.yml`. Includes hot-reloading for frontend/backend, and utility containers like `pgAdmin` and `redis-commander`. Uses development Dockerfiles (`Dockerfile.dev`).
    *   **Production:** Uses `docker-compose.yml` potentially overridden by a `docker-compose.prod.yml` (or uses Docker Compose profiles). Uses production-optimized Dockerfiles (`Dockerfile.prod`). Includes Nginx as a reverse proxy for handling incoming traffic, SSL termination, and serving static frontend assets.
*   **Build Process:** Each service has its own build process defined in its `Dockerfile` (e.g., `npm run build` for Node.js/TS services, Python dependency installation).
*   **Configuration:** Environment variables are managed via `.env` files and passed into containers through the `environment` section in `docker-compose.yml`. Secrets (like API keys, JWT secret) should be handled securely (e.g., Docker secrets, external secret management system).

## 6. Key Features

*   User Authentication & Authorization
*   PowerShell Script Upload, Storage, and Management
*   Script Versioning (Implicit via upload history/potentially explicit)
*   AI-Powered Script Analysis (Security, Best Practices, Complexity)
*   Vector-Based Similar Script Search
*   Script Categorization and Tagging
*   Secure PowerShell Script Execution
*   Execution History and Output Logging
*   Dashboard & Analytics
*   Chat Interface for AI Interaction
*   Voice Command Input and Audio Output
*   User and Settings Management
