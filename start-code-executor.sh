#!/bin/bash

# Start Code Executor Service
# This script starts the code execution backend on port 4001

echo "🚀 Starting Code Executor Service..."

# Check if code-executor directory exists
if [ ! -d "code-executor" ]; then
    echo "❌ Error: code-executor directory not found"
    exit 1
fi

# Change to code-executor directory
cd code-executor

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Kill any existing process on port 4001
echo "🔍 Checking for existing processes on port 4001..."
PORT_PID=$(lsof -ti:4001)
if [ ! -z "$PORT_PID" ]; then
    echo "⚠️  Killing existing process on port 4001 (PID: $PORT_PID)"
    kill -9 $PORT_PID
    sleep 1
fi

# Start the service
echo "✅ Starting service on port 4001..."
npm run dev

# Note: Press Ctrl+C to stop the service
