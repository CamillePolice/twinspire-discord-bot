#!/bin/bash

# Set up logging
LOGFILE="/tmp/twinspire_discord_bot_init.log"
exec 1> >(tee -a "$LOGFILE") 2>&1

function log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" 
}

log "=== Starting Twinspire Bot initialization script ==="

# Enable debug mode
set -x

log "Installing dependencies"
if /workspaces/twinspire-discord-bot/scripts/install_dependencies.sh; then
    log "Successfully executed install_dependencies.sh script"
else
    log "ERROR: Failed to execute install_dependencies.sh script"
    exit 1
fi

log "Setting up git config"
git config --global pull.rebase true
git config --global core.editor "code --wait"

log "=== Initialization completed successfully $(date) ==="
log "Log file available at: $LOGFILE"

set +x  # Disable debug mode