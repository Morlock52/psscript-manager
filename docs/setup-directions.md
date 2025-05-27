# Setup Guide

This guide explains how to launch the container stack for this project.

1. Duplicate the sample environment configuration:

```bash
cp .env.example .env
```

2. Allow helper scripts to execute:

```bash
./make-executable.sh
```

3. Start the services. Choose `dev` or `prod` as needed:

```bash
./docker-start.sh dev
```

Below is a simple overview of the container layout.

![Docker architecture](images/docker-architecture.svg)

