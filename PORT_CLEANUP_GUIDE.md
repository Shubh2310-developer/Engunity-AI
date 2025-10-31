# Port Cleanup & Service Management Guide

## Overview
This guide explains the automated port cleanup system implemented to ensure clean startup of all Engunity AI services.

## Problem Solved
Previously, running `npm run dev` would fail with:
```
Error: listen EADDRINUSE: address already in use :::3000
```

This occurred because:
1. Old Next.js processes weren't being properly killed
2. Port 3000 remained occupied by zombie processes
3. Multiple instances of `npm run dev` could run simultaneously

## Solution Implemented

### 1. **Frontend Cleanup Script** ([frontend/cleanup-port.sh](frontend/cleanup-port.sh))

A dedicated bash script that:
- Checks if port 3000 is in use
- Kills all processes using port 3000
- Verifies port is freed before continuing
- Provides clear status messages

```bash
#!/bin/bash
# Cleanup port 3000 before starting frontend

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

# Wait for cleanup
sleep 1

# Verify port is free
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "⚠️  Warning: Port 3000 may still be in use"
    exit 1
else
    echo "✅ Port 3000 is now free"
    exit 0
fi
```

### 2. **Package.json Pre-Script** ([frontend/package.json](frontend/package.json))

Added `predev` script that runs automatically before `dev`:
```json
{
  "scripts": {
    "predev": "./cleanup-port.sh",
    "dev": "NODE_OPTIONS='--max-old-space-size=512' next dev -p 3000"
  }
}
```

**How it works:**
- npm automatically runs `predev` before `dev`
- The cleanup script ensures port 3000 is free
- Next.js starts cleanly on port 3000

### 3. **Start-All-Services.sh Enhancement** ([start-all-services.sh](start-all-services.sh))

Updated the `cleanup_existing()` function to include port 3000:

```bash
# Function to kill existing processes
cleanup_existing() {
    echo "🧹 Cleaning up existing processes..."

    # Kill processes by port (including frontend port 3000)
    for port in 3000 8000 8001 8002 8003 4001; do
        lsof -ti:$port | xargs -r kill -9 2>/dev/null || true
    done

    # Kill existing backend processes
    pkill -f "run_server.py" 2>/dev/null || true
    # ... additional process cleanup

    sleep 3
}
```

## Usage

### Starting Frontend Only
```bash
cd frontend
npm run dev
```

**Output:**
```
🧹 Cleaning up port 3000...
✅ Port 3000 is already free

> engunity-ai-frontend@1.0.0 dev
> NODE_OPTIONS='--max-old-space-size=512' next dev -p 3000

  ▲ Next.js 14.2.33
  - Local:        http://localhost:3000

 ✓ Ready in 1.8s
```

### Starting All Services
```bash
./start-all-services.sh
```

This will:
1. Clean up all ports (3000, 8000, 8001, 8002, 8003, 4001)
2. Kill any existing backend processes
3. Start services with memory optimizations
4. Wait for health checks

## Ports Used

| Port | Service | Status Endpoint |
|------|---------|----------------|
| 3000 | Frontend (Next.js) | http://localhost:3000 |
| 8000 | Main Backend (FastAPI) | http://localhost:8000/api/health |
| 8001 | Agentic RAG (optional) | http://localhost:8001/health |
| 8002 | Hybrid RAG v3 | http://localhost:8002/health |
| 8003 | Citation Classifier | http://localhost:8003/health |
| 4001 | Code Executor | http://localhost:4001/health |
| 27017 | MongoDB | mongosh connection |

## Troubleshooting

### Port Still in Use After Cleanup

**Symptom:**
```
⚠️  Warning: Port 3000 may still be in use
```

**Solution:**
```bash
# Manual cleanup
lsof -ti:3000 | xargs kill -9

# Or kill all Next.js processes
pkill -9 -f next-server

# Then try again
npm run dev
```

### Multiple Services on Same Port

**Symptom:**
```
Error: listen EADDRINUSE: address already in use
```

**Solution:**
```bash
# Check what's using the port
ss -tulpn | grep :3000

# Kill specific PID
kill -9 <PID>

# Or use the cleanup script
./frontend/cleanup-port.sh
```

### Script Permission Denied

**Symptom:**
```
bash: ./cleanup-port.sh: Permission denied
```

**Solution:**
```bash
chmod +x frontend/cleanup-port.sh
```

## Testing the Cleanup

### Test 1: Clean Startup
```bash
cd frontend
npm run dev
# Should start successfully on port 3000
```

### Test 2: Restart After Running
```bash
# Let frontend run, then restart
npm run dev
# Should cleanup old process and start fresh
```

### Test 3: Manual Kill and Restart
```bash
# Start frontend
npm run dev

# In another terminal, kill it
lsof -ti:3000 | xargs kill -9

# Start again
npm run dev
# Should detect port is free and start
```

## Benefits

1. **No More Port Conflicts**: Automatic cleanup prevents EADDRINUSE errors
2. **Clean Restarts**: Each `npm run dev` starts fresh
3. **Developer Friendly**: No manual intervention needed
4. **Idempotent**: Running multiple times is safe
5. **Fast**: Cleanup completes in ~1 second

## Memory Optimization

The cleanup system works in conjunction with memory optimization:

```json
"dev": "NODE_OPTIONS='--max-old-space-size=512' next dev -p 3000"
```

This limits Node.js heap to 512MB, preventing memory bloat during development.

## Integration with Docker

When running in Docker (production):
- Docker Compose handles port conflicts automatically
- Container restart policies ensure clean startup
- Health checks verify services are ready

See [docker-compose.optimized.yml](docker-compose.optimized.yml) for production configuration.

## Automation

### Auto-Cleanup on System Reboot

Add to crontab:
```bash
@reboot /home/ghost/Engunity-AI/start-all-services.sh
```

### Scheduled Cleanup (Optional)

Clean up zombie processes daily:
```bash
# Add to crontab -e
0 2 * * * lsof -ti:3000,8000,4001 | xargs -r kill -9 2>/dev/null
```

## Related Files

- [frontend/cleanup-port.sh](frontend/cleanup-port.sh) - Port cleanup script
- [frontend/package.json](frontend/package.json) - npm scripts with predev hook
- [start-all-services.sh](start-all-services.sh) - Main startup script
- [stop-all-services.sh](stop-all-services.sh) - Service shutdown script
- [PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md) - Production deployment guide

## Summary

The port cleanup system ensures:
- ✅ No EADDRINUSE errors
- ✅ Clean process management
- ✅ Fast startup (< 2 seconds)
- ✅ No manual intervention needed
- ✅ Works with memory optimization
- ✅ Production-ready

**Status:** Fully Implemented & Tested ✅

---

**Last Updated:** 2025-10-24
**Implemented By:** Claude Code
**Tested:** ✅ Working perfectly
