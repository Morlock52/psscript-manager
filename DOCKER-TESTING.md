i# PSScript Docker Testing Guide

This guide provides instructions for running the PSScript platform tests in a Docker environment.

## Overview

The Docker testing environment allows you to run the PSScript platform tests in a containerized environment, ensuring consistent test results across different machines and environments. The environment includes:

- PostgreSQL database with pgvector extension
- Redis for caching
- Backend API service
- AI analysis service
- Test runner service

## Prerequisites

- Docker installed
- Docker Compose installed
- Git repository cloned

## Files

The Docker testing environment consists of the following files:

- `docker-compose.test.yml` - Docker Compose configuration for the test environment
- `Dockerfile.test` - Dockerfile for the test runner service
- `wait-for-it.sh` - Script to wait for services to be available
- `run-docker-tests.sh` - Script to run the tests in Docker

## Running Tests in Docker

To run the tests in Docker, simply execute the `run-docker-tests.sh` script:

```bash
./run-docker-tests.sh
```

This script will:

1. Check if Docker and Docker Compose are installed
2. Create a test results directory
3. Clean up any existing test containers
4. Build and start the test environment
5. Wait for the services to be ready
6. Run the tests
7. Clean up the test environment

## Test Results

Test results are stored in the `test-results` directory. This directory is mounted as a volume in the test runner container, so the results are preserved even after the container is removed.

## Customizing Tests

### Running Specific Tests

To run specific tests, you can modify the `run-tests-in-docker.sh` script in the `Dockerfile.test` file. For example, to run only the upload test:

```bash
RUN echo '#!/bin/bash\n\
echo "Running PSScript tests in Docker..."\n\
./verify-test-setup.sh\n\
./run-specific-test.sh upload\n\
' > run-tests-in-docker.sh && chmod +x run-tests-in-docker.sh
```

### Adding Test Data

To add test data to the PostgreSQL database, you can create a SQL file in the `src/db/seeds` directory and mount it in the `postgres` service in the `docker-compose.test.yml` file:

```yaml
postgres:
  extends:
    file: docker-compose.yml
    service: postgres
  volumes:
    - postgres_test_data:/var/lib/postgresql/data
    - ./src/db/schema.sql:/docker-entrypoint-initdb.d/01-schema.sql
    - ./src/db/seeds/01-initial-data.sql:/docker-entrypoint-initdb.d/02-seed-data.sql
    - ./src/db/seeds/02-test-data.sql:/docker-entrypoint-initdb.d/03-test-data.sql
    - ./src/db/seeds/03-your-test-data.sql:/docker-entrypoint-initdb.d/04-your-test-data.sql
```

## Troubleshooting

### Services Not Starting

If the services are not starting, check the logs:

```bash
docker-compose -f docker-compose.test.yml logs
```

### Tests Failing

If the tests are failing, check the test results in the `test-results` directory. You can also check the logs of the test runner container:

```bash
docker-compose -f docker-compose.test.yml logs test-runner
```

### Database Connection Issues

If the tests are failing due to database connection issues, check the PostgreSQL logs:

```bash
docker-compose -f docker-compose.test.yml logs postgres
```

Make sure the PostgreSQL service is running and accessible from the test runner container:

```bash
docker-compose -f docker-compose.test.yml run --rm test-runner ./wait-for-it.sh postgres:5432 -- echo "PostgreSQL is ready"
```

## Advanced Usage

### Running Tests in CI/CD

To run the tests in a CI/CD pipeline, you can use the `run-docker-tests.sh` script. For example, in a GitHub Actions workflow:

```yaml
name: Run Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v2
    - name: Run tests
      run: ./run-docker-tests.sh
```

### Running Tests Against a Deployment

To run the tests against a deployment, you can modify the `API_URL` environment variable in the `test-runner` service in the `docker-compose.test.yml` file:

```yaml
test-runner:
  build:
    context: .
    dockerfile: Dockerfile.test
  volumes:
    - .:/app
    - /app/node_modules
    - ./test-results:/app/test-results
  depends_on:
    - backend
    - ai-service
    - postgres
    - redis
  environment:
    - API_URL=https://your-deployment-url.com/api
    - TEST_ENV=docker
    - NODE_ENV=test
  command: ["./wait-for-it.sh", "backend:4000", "--", "./run-tests-in-docker.sh"]
```

## Conclusion

The Docker testing environment provides a consistent and reliable way to run the PSScript platform tests. By using Docker, you can ensure that the tests run in the same environment regardless of the host machine, making it easier to reproduce and fix issues.
