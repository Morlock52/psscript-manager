# Agent Guidelines for PSScript Manager

This repository hosts a Docker-based stack for managing PowerShell scripts.  
Services include a Python AI component (`src/ai`), a Node.js backend, and a React
frontend. Most of the current logic lives in the Python service and it has basic
unit tests under `tests/`.

## Coding Standards
- **Python**: follow PEP 8 and use type hints when practical. Document functions
  with docstrings.
- **JavaScript/TypeScript**: keep to the existing style in the repository and
  use meaningful names. Linting configuration is minimal, so keep code tidy.
- **Shell scripts**: keep them POSIX compliant where possible.

## Commit Requirements
- Write clear, descriptive commit messages. Reference issue numbers when
  relevant.
- Keep commits focused; avoid bundling unrelated changes.

## Testing
- Run Python tests with `pytest -q` before committing any change that might
  affect them. Add tests for new Python features or bug fixes.
- There are currently no automated tests for the Node.js or React components,
  but verify that Docker builds succeed if you modify those areas.

## Documentation
- Update `README.md`, `docs/`, or in-code comments when behavior or interfaces
  change.
- Document new environment variables in `.env.example` when applicable.

## Project Scripts
- `setup-check.sh` starts the Docker stack and checks prerequisites.
- `update-app.sh` pulls the latest code and rebuilds containers.
- `docker-start.sh` is a simplified startup script.

Use these scripts when verifying multi-service behavior.

