#!/bin/bash
set -euo pipefail

# Health check endpoints
ENDPOINTS=(
    "http://localhost/health"
    "http://localhost/api/health"
    "http://localhost:4000/api/health"
    "http://localhost:8000/health"
)

# Check each endpoint
failed=0
for endpoint in "${ENDPOINTS[@]}"; do
    if curl -sf "$endpoint" > /dev/null 2>&1; then
        echo "✓ $endpoint is healthy"
    else
        echo "✗ $endpoint is unhealthy"
        ((failed++))
    fi
done

# Check container health
unhealthy_containers=$(docker ps --filter health=unhealthy --format "{{.Names}}" | wc -l)
if [ "$unhealthy_containers" -gt 0 ]; then
    echo "✗ Found $unhealthy_containers unhealthy containers"
    docker ps --filter health=unhealthy
    ((failed++))
fi

if [ $failed -eq 0 ]; then
    echo "✓ All health checks passed"
    exit 0
else
    echo "✗ $failed health checks failed"
    exit 1
fi
