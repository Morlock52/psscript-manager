# PSScript Manager

PSScript Manager is an AI-powered PowerShell script management and analysis platform.
This repository includes the Docker configuration and a basic AI service implementation.
The remaining application services are still under development.

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
- `setup-check.sh` – verifies prerequisites and starts the stack
- `update-app.sh` – pulls the latest code and rebuilds containers
- `src/ai` – placeholder for the Python AI service
- `src/backend` – placeholder for the Node.js API
- `src/frontend` – placeholder for the React frontend

## Installation

First, clone the repository to your local machine:

```bash
git clone https://github.com/YOUR_USERNAME/psscript-manager.git
cd psscript-manager
```

The root of the cloned project contains a `.env.example` file that you'll copy in the next step.

## Getting Started

Run the automated setup script. Pass `dev` or `prod` depending on your
environment:

```bash
./setup-check.sh dev
```

Logs for the AI service are written to the path specified by `LOG_FILE`
(default `./logs/app.log`).

The containers will start, but the application services are empty until the source code is added.

## Updating

To fetch the latest code and rebuild the containers, run:

```bash
./update-app.sh dev   # or 'prod'
```

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

