#!/bin/bash

# Set up logging
LOGFILE="/tmp/insta_dependencies.log"
exec 1> >(tee -a "$LOGFILE") 2>&1

function log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "Checking environment..."

if [ -z "$REMOTE_CONTAINERS" ]; then
  log "Not in devcontainer, exiting"
  exit 0
fi

log "Install node dependencies for bot..."
cd /workspaces/twinspire-discord-bot/bot && npm install
log "Installation successful
