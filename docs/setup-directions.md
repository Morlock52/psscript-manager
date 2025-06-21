# Setup Guide

This guide helps you launch the PSScript Manager containers with minimal effort.
The `setup-check.sh` script verifies prerequisites, installs missing packages when
possible, checks port availability, and then starts the stack.

## 1. Clone the repository

```bash
git clone https://github.com/Morlock52/psscript-manager.git
cd psscript-manager
```

## 2. Run the automated setup

Execute the helper script and choose `dev` or `prod`:

```bash
./setup-check.sh dev
```

The script performs the following actions:

- Ensures **Docker** and **Docker Compose** are installed (installs them on
  Debian-based systems if missing).
- Creates `.env` from `.env.example` when not present.
- Checks that the default ports (5432, 6379, 4000, 5173 and 5000) are free.
  If a port is taken, the script suggests an alternative value so you can
  update `.env` accordingly.
- Starts the Docker containers and prints their status.

## 3. Updating later

When updates are available, run:

```bash
./update-app.sh dev   # or 'prod'
```

Below is a simple overview of the container layout.

![Docker architecture](images/docker-architecture.svg)
