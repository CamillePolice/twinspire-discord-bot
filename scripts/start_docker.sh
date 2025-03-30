#!/bin/bash

# Set up logging
LOGFILE="/tmp/docker_startup.log"
exec 1> >(tee -a "$LOGFILE") 2>&1

function log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Checking environment..."

if [ -z "$REMOTE_CONTAINERS" ]; then
  log "Not in devcontainer, exiting"
  exit 0
fi

log "Starting docker..."
if /workspaces/twinspire-discord-bot/scripts/start_docker.sh; then
    log "Successfully started docker containers script"
else
    log "ERROR: Failed to start docker container script"
    exit 1
fi