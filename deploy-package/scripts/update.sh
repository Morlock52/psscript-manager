#!/bin/bash
set -euo pipefail

DEPLOYMENT_DIR="/opt/psscript"
BACKUP_DIR="/opt/psscript-backups"
LOG_FILE="/var/log/psscript/update.log"

# Create log directory
mkdir -p "$(dirname "$LOG_FILE")"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Create backup
create_backup() {
    log "Creating backup..."
    mkdir -p "$BACKUP_DIR"
    
    # Backup database
    docker exec psscript-postgres pg_dump -U postgres psscript > "$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).sql"
    
    # Backup volumes
    docker run --rm -v psscript_postgres_data:/data -v "$BACKUP_DIR":/backup alpine tar czf /backup/postgres-data-$(date +%Y%m%d-%H%M%S).tar.gz -C /data .
    
    # Backup current deployment
    tar czf "$BACKUP_DIR/deployment-$(date +%Y%m%d-%H%M%S).tar.gz" -C "$DEPLOYMENT_DIR" .
    
    # Keep only last 5 backups
    ls -t "$BACKUP_DIR"/*.tar.gz | tail -n +6 | xargs -r rm
    ls -t "$BACKUP_DIR"/*.sql | tail -n +6 | xargs -r rm
    
    log "Backup completed"
}

# Perform health check
health_check() {
    bash "$DEPLOYMENT_DIR/scripts/health-check.sh"
}

# Update application
update_application() {
    log "Starting application update..."
    
    # Extract new version
    tar xzf /tmp/psscript-update.tar.gz -C "$DEPLOYMENT_DIR"
    
    # Pull new images
    docker-compose pull
    
    # Perform rolling update
    docker-compose up -d --no-deps --build backend
    sleep 30
    
    if health_check; then
        docker-compose up -d --no-deps --build ai-service
        sleep 20
        
        if health_check; then
            docker-compose up -d --no-deps --build nginx
            sleep 10
            
            if health_check; then
                log "Update completed successfully"
                return 0
            fi
        fi
    fi
    
    log "Update failed, initiating rollback..."
    return 1
}

# Rollback function
rollback() {
    log "Starting rollback..."
    
    # Find latest backup
    latest_backup=$(ls -t "$BACKUP_DIR"/deployment-*.tar.gz | head -1)
    
    if [ -n "$latest_backup" ]; then
        # Stop services
        docker-compose down
        
        # Restore deployment
        rm -rf "$DEPLOYMENT_DIR"/*
        tar xzf "$latest_backup" -C "$DEPLOYMENT_DIR"
        
        # Start services
        docker-compose up -d
        
        sleep 30
        
        if health_check; then
            log "Rollback completed successfully"
        else
            log "Rollback failed - manual intervention required"
            exit 1
        fi
    else
        log "No backup found for rollback"
        exit 1
    fi
}

# Main update process
main() {
    cd "$DEPLOYMENT_DIR"
    
    # Pre-update health check
    if ! health_check; then
        log "Pre-update health check failed"
        exit 1
    fi
    
    # Create backup
    create_backup
    
    # Attempt update
    if update_application; then
        log "Update successful"
        
        # Cleanup old images
        docker image prune -f
    else
        rollback
    fi
    
    # Send logs to remote server
    if [ -n "${LOG_SHIP_URL:-}" ]; then
        curl -X POST "$LOG_SHIP_URL" \
            -H "Content-Type: text/plain" \
            --data-binary "@$LOG_FILE" || true
    fi
}

# Run main function
main "$@"
