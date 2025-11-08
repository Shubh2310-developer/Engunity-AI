#!/bin/bash
export NPM_CONFIG_CACHE=$HOME/.npm-cache-linux
export npm_config_cache=$HOME/.npm-cache-linux
mkdir -p $HOME/.npm-cache-linux

echo "🚀 Starting npm install with WSL-safe configuration..."
npm install --cache $HOME/.npm-cache-linux --legacy-peer-deps --force --no-audit --no-fund --prefer-offline

if [ $? -eq 0 ]; then
    echo "✅ Installation successful!"
    echo "You can now run: npm run dev"
else
    echo "❌ Installation failed. Trying alternative..."
    echo "Attempting yarn install..."
    
    # Try to install yarn if not available
    if ! command -v yarn &> /dev/null; then
        npm install -g yarn --cache $HOME/.npm-cache-linux --force
    fi
    
    # Use yarn
    yarn install --ignore-engines --network-timeout 100000
fi