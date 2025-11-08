#!/bin/bash
export NPM_CONFIG_CACHE="$HOME/.local/npm-cache"
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build
