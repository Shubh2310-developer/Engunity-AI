#!/bin/bash

# Load NVM if available
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

export NODE_OPTIONS="--max-old-space-size=1024"
export NPM_CONFIG_CACHE=~/.npm-cache
npm run dev
