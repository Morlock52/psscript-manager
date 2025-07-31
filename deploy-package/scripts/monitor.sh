#!/bin/bash
set -euo pipefail

# Continuous monitoring script
while true; do
    # Collect metrics
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Docker stats
    DOCKER_STATS=$(docker stats --no-stream --format "json" 2>/dev/null || echo '{}')
    
    # Disk usage
    DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    
    # Memory usage
    MEMORY_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
    
    # Create metrics JSON
    cat > /tmp/metrics.json << JSON
{
    "timestamp": "$TIMESTAMP",
    "disk_usage_percent": $DISK_USAGE,
    "memory_usage_percent": $MEMORY_USAGE,
    "docker_stats": $DOCKER_STATS,
    "health_check": $(bash /opt/psscript/scripts/health-check.sh > /dev/null 2>&1 && echo "true" || echo "false")
}
JSON
    
    # Ship metrics if URL provided
    if [ -n "${METRICS_URL:-}" ]; then
        curl -s -X POST "$METRICS_URL" \
            -H "Content-Type: application/json" \
            -d @/tmp/metrics.json || true
    fi
    
    # Auto-recovery
    if ! bash /opt/psscript/scripts/health-check.sh > /dev/null 2>&1; then
        echo "Health check failed, attempting recovery..."
        
        # Restart unhealthy containers
        docker ps --filter health=unhealthy --format "{{.Names}}" | xargs -r docker restart
        
        # Wait and recheck
        sleep 30
        
        if ! bash /opt/psscript/scripts/health-check.sh > /dev/null 2>&1; then
            # Send alert
            if [ -n "${ALERT_URL:-}" ]; then
                curl -s -X POST "$ALERT_URL" \
                    -H "Content-Type: application/json" \
                    -d '{"alert": "PSScript health check failed after auto-recovery attempt"}' || true
            fi
        fi
    fi
    
    # Sleep for 5 minutes
    sleep 300
done
