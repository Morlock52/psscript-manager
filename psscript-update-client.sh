#!/bin/bash

# PSScript Auto-Update Client
# This script checks for updates and applies them automatically
# It should be run via cron on the server

set -euo pipefail

# Configuration
UPDATE_SERVER="${UPDATE_SERVER:-https://your-update-server.com}"
APP_DIR="/opt/psscript"
LOG_DIR="/var/log/psscript"
LOG_FILE="$LOG_DIR/auto-update.log"
VERSION_FILE="$APP_DIR/.version"
BACKUP_DIR="/opt/psscript-backups"

# Create directories
mkdir -p "$LOG_DIR" "$BACKUP_DIR"

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Error handling
error_handler() {
    local line_no=$1
    local error_code=$2
    log "ERROR: Line $line_no: Command exited with status $error_code"
    
    # Send error notification
    if [ -n "${WEBHOOK_URL:-}" ]; then
        curl -s -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{
                \"type\": \"update_error\",
                \"server\": \"$(hostname)\",
                \"error\": \"Update failed at line $line_no with code $error_code\",
                \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
            }" || true
    fi
    
    # Attempt rollback
    rollback
}

trap 'error_handler ${LINENO} $?' ERR

# Get current version
get_current_version() {
    if [ -f "$VERSION_FILE" ]; then
        cat "$VERSION_FILE"
    else
        echo "0.0.0"
    fi
}

# Check for updates
check_for_updates() {
    log "Checking for updates..."
    
    local current_version=$(get_current_version)
    
    # Check update server
    local response=$(curl -sf "$UPDATE_SERVER/api/check-update" \
        -H "X-Current-Version: $current_version" \
        -H "X-Server-ID: $(hostname)" || echo '{"error": "Failed to check updates"}')
    
    echo "$response"
}

# Download update
download_update() {
    local update_url=$1
    local update_hash=$2
    
    log "Downloading update from $update_url..."
    
    # Download to temp file
    local temp_file="/tmp/psscript-update-$(date +%s).tar.gz"
    
    if ! curl -sfL "$update_url" -o "$temp_file"; then
        log "ERROR: Failed to download update"
        return 1
    fi
    
    # Verify hash
    local actual_hash=$(sha256sum "$temp_file" | cut -d' ' -f1)
    if [ "$actual_hash" != "$update_hash" ]; then
        log "ERROR: Update hash mismatch. Expected: $update_hash, Got: $actual_hash"
        rm -f "$temp_file"
        return 1
    fi
    
    echo "$temp_file"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    # Backup database
    docker exec psscript-postgres pg_dump -U postgres psscript > "$backup_path.sql" 2>/dev/null || {
        log "WARNING: Database backup failed (might be using mock backend)"
    }
    
    # Backup application files
    tar -czf "$backup_path.tar.gz" -C "$APP_DIR" . || {
        log "ERROR: Failed to create backup"
        return 1
    }
    
    # Keep only last 5 backups
    ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm
    
    log "Backup created: $backup_path.tar.gz"
    echo "$backup_path"
}

# Apply update
apply_update() {
    local update_file=$1
    local new_version=$2
    
    log "Applying update to version $new_version..."
    
    cd "$APP_DIR"
    
    # Stop services
    docker-compose down || {
        log "WARNING: Failed to stop services gracefully"
        docker stop $(docker ps -q) 2>/dev/null || true
    }
    
    # Extract update
    tar -xzf "$update_file" || {
        log "ERROR: Failed to extract update"
        return 1
    }
    
    # Update version file
    echo "$new_version" > "$VERSION_FILE"
    
    # Start services
    docker-compose up -d || {
        log "ERROR: Failed to start services"
        return 1
    }
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    # Health check
    if health_check; then
        log "Update applied successfully"
        rm -f "$update_file"
        return 0
    else
        log "ERROR: Health check failed after update"
        return 1
    fi
}

# Health check
health_check() {
    local checks_passed=0
    local total_checks=2
    
    # Check frontend
    if curl -sf "http://localhost/health" > /dev/null; then
        ((checks_passed++))
        log "✓ Frontend health check passed"
    else
        log "✗ Frontend health check failed"
    fi
    
    # Check backend
    if curl -sf "http://localhost/api/health" > /dev/null; then
        ((checks_passed++))
        log "✓ Backend health check passed"
    else
        log "✗ Backend health check failed"
    fi
    
    # Check container health
    local unhealthy=$(docker ps --filter health=unhealthy --format "{{.Names}}" | wc -l)
    if [ "$unhealthy" -eq 0 ]; then
        log "✓ All containers healthy"
    else
        log "✗ Found $unhealthy unhealthy containers"
        docker ps --filter health=unhealthy
    fi
    
    [ "$checks_passed" -eq "$total_checks" ]
}

# Rollback
rollback() {
    log "Initiating rollback..."
    
    cd "$APP_DIR"
    
    # Find latest backup
    local latest_backup=$(ls -t "$BACKUP_DIR"/backup-*.tar.gz 2>/dev/null | head -1)
    
    if [ -z "$latest_backup" ]; then
        log "ERROR: No backup found for rollback"
        return 1
    fi
    
    log "Rolling back to: $latest_backup"
    
    # Stop everything
    docker-compose down 2>/dev/null || docker stop $(docker ps -q) 2>/dev/null || true
    
    # Restore backup
    rm -rf "$APP_DIR"/*
    tar -xzf "$latest_backup" -C "$APP_DIR" || {
        log "ERROR: Failed to restore backup"
        return 1
    }
    
    # Restore database if sql backup exists
    local sql_backup="${latest_backup%.tar.gz}.sql"
    if [ -f "$sql_backup" ]; then
        docker-compose up -d postgres
        sleep 10
        docker exec -i psscript-postgres psql -U postgres psscript < "$sql_backup" || {
            log "WARNING: Database restore failed"
        }
    fi
    
    # Start services
    docker-compose up -d
    
    sleep 30
    
    if health_check; then
        log "Rollback completed successfully"
        
        # Notify about rollback
        if [ -n "${WEBHOOK_URL:-}" ]; then
            curl -s -X POST "$WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d "{
                    \"type\": \"rollback_success\",
                    \"server\": \"$(hostname)\",
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
                }" || true
        fi
    else
        log "ERROR: Rollback failed - manual intervention required"
        return 1
    fi
}

# Send logs
send_logs() {
    if [ -n "${LOG_SHIP_URL:-}" ] && [ -f "$LOG_FILE" ]; then
        # Get last 1000 lines of logs
        tail -n 1000 "$LOG_FILE" | curl -s -X POST "$LOG_SHIP_URL" \
            -H "Content-Type: text/plain" \
            -H "X-Server-ID: $(hostname)" \
            -H "X-Log-Type: auto-update" \
            --data-binary @- || true
    fi
}

# Main update process
main() {
    log "Starting auto-update check..."
    
    # Pre-update health check
    if ! health_check; then
        log "Pre-update health check failed, skipping update"
        send_logs
        exit 1
    fi
    
    # Check for updates
    local update_info=$(check_for_updates)
    
    # Parse response
    local has_update=$(echo "$update_info" | jq -r '.has_update // false')
    
    if [ "$has_update" != "true" ]; then
        log "No updates available"
        send_logs
        exit 0
    fi
    
    local new_version=$(echo "$update_info" | jq -r '.version')
    local update_url=$(echo "$update_info" | jq -r '.download_url')
    local update_hash=$(echo "$update_info" | jq -r '.sha256')
    
    log "Update available: $new_version"
    
    # Create backup
    if ! create_backup; then
        log "Failed to create backup, aborting update"
        send_logs
        exit 1
    fi
    
    # Download update
    local update_file=$(download_update "$update_url" "$update_hash")
    if [ -z "$update_file" ]; then
        log "Failed to download update"
        send_logs
        exit 1
    fi
    
    # Apply update
    if apply_update "$update_file" "$new_version"; then
        log "Update completed successfully"
        
        # Send success notification
        if [ -n "${WEBHOOK_URL:-}" ]; then
            curl -s -X POST "$WEBHOOK_URL" \
                -H "Content-Type: application/json" \
                -d "{
                    \"type\": \"update_success\",
                    \"server\": \"$(hostname)\",
                    \"version\": \"$new_version\",
                    \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
                }" || true
        fi
    else
        log "Update failed, rollback was attempted"
    fi
    
    # Send logs
    send_logs
}

# Run main function
main "$@"