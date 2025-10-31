#!/bin/bash
# Cleanup port 3000 before starting frontend
# This script kills any existing Next.js processes on port 3000

echo "🧹 Cleaning up port 3000..."

# Get PIDs from port 3000
PIDS=$(lsof -ti:3000 2>/dev/null)

if [ -z "$PIDS" ]; then
    echo "✅ Port 3000 is already free"
    exit 0
fi

# Kill the processes
echo "🔴 Killing processes: $PIDS"
for pid in $PIDS; do
    kill -9 $pid 2>/dev/null || true
done

# Wait a moment for cleanup
sleep 1

# Verify port is free
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Warning: Port 3000 may still be in use"
    exit 1
else
    echo "✅ Port 3000 is now free"
    exit 0
fi
