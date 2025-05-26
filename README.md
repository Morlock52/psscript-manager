# PSScript Manager

PSScript Manager is an AI-powered PowerShell script management and analysis platform.
This repository currently contains only the Docker configuration and placeholder
service directories. The application source code has not yet been published.

## Features (planned)

- Script Management
- AI-Powered Analysis
- Categorization
- Search & Discovery
- Vector Database
- Multi-Agent System
- Documentation Integration
- User Authentication

## Repository Contents

- `docker-compose.yml` – container configuration
- `docker-compose.override.yml` – development overrides
- `docker-start.sh` – helper script to launch containers
- `make-executable.sh` – sets execute permissions for scripts
- `src/ai` – placeholder for the Python AI service
- `src/backend` – placeholder for the Node.js API
- `src/frontend` – placeholder for the React frontend

## Getting Started

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Make the startup script executable and run the containers:

```bash
./make-executable.sh
./docker-start.sh dev   # or 'prod'
```

The containers will start, but the application services are empty until the
source code is added.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Acknowledgments

- [LangChain](https://github.com/langchain-ai/langchain)
- [LangGraph](https://github.com/langchain-ai/langgraph)
- [pgvector](https://github.com/pgvector/pgvector)
- [React](https://reactjs.org/)
- [Express](https://expressjs.com/)
- [TypeScript](https://www.typescriptlang.org/)

