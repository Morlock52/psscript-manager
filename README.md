# PSScript Manager

An AI-powered PowerShell script management and analysis platform that helps you organize, analyze, and optimize your PowerShell scripts.

<!-- Dashboard screenshot will be added later -->

## Features

- **Script Management**: Upload, organize, and version control your PowerShell scripts
- **AI-Powered Analysis**: Get insights into script quality, security, and performance
- **Categorization**: Automatically categorize scripts based on their functionality
- **Search & Discovery**: Find scripts quickly with powerful search capabilities
- **Vector Database**: Semantic search for finding similar scripts and code snippets
- **Multi-Agent System**: Leverage multiple AI agents for enhanced script analysis
- **Documentation Integration**: Access PowerShell documentation directly within the platform
- **User Authentication**: Secure access with user accounts and permissions

## Architecture

PSScript Manager consists of several components:

- **Frontend**: React-based web application with TypeScript
- **Backend**: Node.js API server with Express and TypeScript
- **Database**: PostgreSQL with pgvector extension for vector embeddings
- **AI Service**: Python-based AI service with LangChain, LangGraph, and other AI frameworks
- **Vector Database**: Specialized database for storing and querying script embeddings

## Prerequisites

- Node.js (v16+)
- PostgreSQL (v14+) with pgvector extension
- Python (v3.9+)
- Docker (optional, for containerized deployment)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Morlock52/psscript-manager.git
cd psscript-manager
```

### 2. Set up environment variables

Copy the example environment file and update it with your configuration:

```bash
cp .env.example .env
```

Edit the `.env` file with your database credentials and other configuration options.

### 3. Set up the database

Install PostgreSQL and the pgvector extension, then run the database setup script:

```bash
./setup-local-db.sh
```

### 4. Install dependencies

```bash
# Install backend dependencies
cd src/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Install AI service dependencies
cd ../ai
pip install -r requirements.txt
```

### 5. Start the services

You can start all services with the provided script:

```bash
./start-all.sh
```

Or start individual components:

```bash
# Start the backend server
./start-backend.sh

# Start the frontend development server
./start-frontend.sh

# Start the AI service
./start-ai-service.sh
```

## Docker Deployment

PSScript Manager can be easily deployed using Docker and Docker Compose.

### Prerequisites

- Docker
- Docker Compose

### Running with Docker

1. Make scripts executable:

```bash
./make-executable.sh
```

2. Start the application in production mode:

```bash
./docker-start.sh
```

Or in development mode:

```bash
./docker-start.sh dev
```

### Docker Components

The Docker setup includes the following services:

- **postgres**: PostgreSQL database with pgvector extension
- **redis**: Redis for caching and session management
- **backend**: Node.js API server
- **frontend**: React web application
- **ai-service**: Python-based AI service

In development mode, additional services are available:

- **pgadmin**: Web-based PostgreSQL administration tool (available at http://localhost:5050)
- **redis-commander**: Web-based Redis administration tool (available at http://localhost:8081)

## Usage

### Accessing the Application

Once all services are running, you can access the application at:

- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api

### User Registration

1. Navigate to http://localhost:5173
2. Click "Sign Up" to create a new account
3. Verify your email address (if email verification is enabled)
4. Log in with your credentials

### Managing Scripts

1. Upload scripts via the "Upload" button on the Scripts page
2. View and edit scripts in the script editor
3. Organize scripts into categories
4. Add tags to scripts for better organization
5. Search for scripts using the search bar

### AI Analysis

1. Select a script and click "Analyze" to run AI analysis
2. View security scores, quality metrics, and recommendations
3. Apply suggested improvements to your scripts

### Documentation

1. Access PowerShell documentation via the Documentation page
2. Search for specific cmdlets or concepts
3. View examples and usage guidelines

## Development

### Project Structure

```
psscript-manager/
├── src/
│   ├── ai/                 # AI service
│   │   ├── agents/         # AI agents
│   │   ├── analysis/       # Script analysis
│   │   └── embeddings/     # Vector embeddings
│   ├── backend/            # Backend API server
│   │   ├── src/            # Source code
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── models/
│   │   │   └── routes/
│   ├── db/                 # Database migrations and seeds
│   │   ├── migrations/
│   │   └── seeds/
│   ├── frontend/           # Frontend application
│   │   ├── public/
│   │   └── src/
│   │       ├── components/
│   │       ├── contexts/
│   │       ├── hooks/
│   │       ├── pages/
│   │       └── services/
│   └── psscript-vector-db/ # Vector database service
├── docker-compose.yml      # Docker configuration
├── docker-compose.override.yml # Development Docker configuration
├── .env.example            # Example environment variables
└── README.md               # This file
```

### Running Tests

```bash
# Run backend tests
cd src/backend
npm test

# Run frontend tests
cd src/frontend
npm test

# Run AI service tests
cd src/ai
python -m pytest
```

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Ensure PostgreSQL is running
   - Check database credentials in `.env` file
   - Verify pgvector extension is installed

2. **AI Service Not Starting**
   - Check Python version (3.9+ required)
   - Verify all dependencies are installed
   - Check for errors in the AI service logs

3. **Frontend Build Errors**
   - Clear node_modules and reinstall dependencies
   - Check for TypeScript errors
   - Verify Vite configuration

4. **Docker Issues**
   - Ensure Docker and Docker Compose are installed
   - Check if ports are already in use
   - Verify Docker daemon is running
   - Check Docker logs with `docker-compose logs`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [LangChain](https://github.com/langchain-ai/langchain) - Framework for AI applications
- [LangGraph](https://github.com/langchain-ai/langgraph) - Multi-agent orchestration
- [pgvector](https://github.com/pgvector/pgvector) - Vector similarity search for PostgreSQL
- [React](https://reactjs.org/) - Frontend framework
- [Express](https://expressjs.com/) - Backend framework
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript