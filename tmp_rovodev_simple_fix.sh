#!/bin/bash

echo "🔧 Simple WSL NPM Fix"
echo "===================="

# Kill any running npm processes
pkill -f npm 2>/dev/null || true

# Complete cleanup
rm -rf node_modules package-lock.json .next .npm

# Force clean npm cache using both methods
npm cache clean --force 2>/dev/null || true
rm -rf ~/.npm 2>/dev/null || true

# Set environment to avoid Windows paths
export NPM_CONFIG_CACHE=$HOME/.npm-cache-linux
export npm_config_cache=$HOME/.npm-cache-linux
mkdir -p $HOME/.npm-cache-linux

# Try pnpm if available, otherwise npm with specific flags
if command -v pnpm >/dev/null 2>&1; then
    echo "Using pnpm..."
    pnpm install --force --no-frozen-lockfile
else
    echo "Using npm with WSL-safe flags..."
    npm install --cache $HOME/.npm-cache-linux --legacy-peer-deps --force --no-audit --no-fund
fi

echo "✅ Installation complete!"
echo "Test with: npm run dev"