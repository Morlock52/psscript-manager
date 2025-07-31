# Contributing to PSScript Manager

Thank you for considering contributing to PSScript Manager! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and considerate of others.

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please create an issue with the following information:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (OS, browser, etc.)

### Suggesting Features

We welcome feature suggestions! Please create an issue with:

- A clear, descriptive title
- Detailed description of the proposed feature
- Any relevant examples or mockups
- Explanation of why this feature would be useful

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests to ensure your changes don't break existing functionality
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js (v16+)
- PostgreSQL (v14+) with pgvector extension
- Python (v3.9+)
- Docker (optional, for containerized deployment)

### Installation

1. Clone your fork of the repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/psscript-manager.git
   cd psscript-manager
   ```

2. Set up environment variables
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your configuration.

3. Set up the database
   ```bash
   ./setup-local-db.sh
   ```

4. Install dependencies
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

5. Start the services
   ```bash
   ./start-all.sh
   ```

## Coding Standards

### JavaScript/TypeScript

- Use ESLint with the provided configuration
- Follow the existing code style
- Write meaningful variable and function names
- Add comments for complex logic
- Use TypeScript types appropriately

### Python

- Follow PEP 8 style guide
- Use type hints where appropriate
- Document functions and classes with docstrings
- Use meaningful variable and function names

### CSS/SCSS

- Follow the existing component structure
- Use Tailwind CSS utility classes when possible
- Keep styles modular and reusable

## Testing

- Write tests for new features and bug fixes
- Ensure all tests pass before submitting a pull request
- Follow the existing testing patterns

## Documentation

- Update documentation for any changes to APIs, features, or behavior
- Use clear, concise language
- Include examples where appropriate

## Commit Messages

- Use clear, descriptive commit messages
- Reference issue numbers when applicable
- Keep commits focused on a single change

## Review Process

- All pull requests will be reviewed by maintainers
- Address any requested changes promptly
- Be open to feedback and suggestions

## License

By contributing to PSScript Manager, you agree that your contributions will be licensed under the project's MIT License.
