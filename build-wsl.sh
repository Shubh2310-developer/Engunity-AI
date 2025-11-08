#!/bin/bash
export NODE_OPTIONS="--max-old-space-size=2048"
export NPM_CONFIG_CACHE=~/.npm-cache
npm run build
