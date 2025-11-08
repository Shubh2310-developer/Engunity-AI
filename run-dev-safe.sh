#!/bin/bash

# Load NVM if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

export NPM_CONFIG_CACHE="$HOME/.local/npm-cache"
export NODE_OPTIONS="--max-old-space-size=1024"
export FORCE_COLOR=1
npm run dev
