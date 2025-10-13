# Code Executor Service Setup Guide

## ✅ Service Status: RUNNING

The code executor service is now properly configured and running!

## 📋 Configuration Summary

### Ports
- **Main Backend**: `http://localhost:4000`
- **Code Executor**: `http://localhost:4001` ✓
- **Frontend**: `http://localhost:3000`

### Service Details
- **Status**: ✅ Running
- **Port**: 4001 (unique, no conflicts)
- **Docker**: ✅ Connected
- **MongoDB**: ⚠️ Optional (not required for code execution)
- **Supported Languages**: Python, JavaScript, TypeScript, Java, C++, C, Go, Rust, PHP, Ruby, C#, Bash

## 🚀 Quick Start

### Start Code Executor
```bash
cd /home/ghost/engunity-ai
./start-code-executor.sh
```

Or manually:
```bash
cd code-executor
npm run dev
```

### Check Service Health
```bash
curl http://localhost:4001/health
```

Expected response:
```json
{
  "status": "ok",
  "docker": "connected",
  "mongodb": "optional",
  "message": "Backend API is running"
}
```

### Test Code Execution
```bash
curl -X POST http://localhost:4001/api/execute \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"print(\"Hello World\")"}'
```

## 🔧 Configuration Files

### 1. Code Executor (.env)
```
PORT=4001                    # Unique port (changed from 4000)
NODE_ENV=development
MAX_EXECUTION_TIME=30000     # 30 seconds timeout
MAX_MEMORY_MB=512           # 512MB memory limit
FRONTEND_URL=http://localhost:3000
```

### 2. Frontend (.env.local)
```
NEXT_PUBLIC_CODE_EXECUTOR_URL=http://localhost:4001
```

## 📝 API Endpoints

### Health Check
```
GET http://localhost:4001/health
```

### Execute Code
```
POST http://localhost:4001/api/execute
Content-Type: application/json

{
  "language": "python",
  "code": "print('Hello World')",
  "timeout": 30000
}
```

### Get Supported Languages
```
GET http://localhost:4001/api/languages
```

## 🐳 Docker Requirements

### Docker Status
- **Required**: Yes (for code execution)
- **Current Status**: ✅ Connected
- **Socket**: `/var/run/docker.sock`

### Supported Language Images
The service will automatically pull these Docker images when first used:
- Python: `python:3.11-slim`
- Node.js: `node:20-slim`
- Java: `openjdk:21-slim`
- GCC (C/C++): `gcc:latest`
- Go: `golang:1.21-alpine`
- Rust: `rust:latest`
- PHP: `php:8.2-cli`
- Ruby: `ruby:3.2-slim`
- .NET (C#): `mcr.microsoft.com/dotnet/sdk:8.0`
- Bash: `bash:latest`

## 🔒 Security Features

- ✅ Network isolation (no internet access in containers)
- ✅ Memory limits (512MB default)
- ✅ CPU limits (1 CPU core)
- ✅ Execution timeout (30s default)
- ✅ Output size limits (1MB)
- ✅ Read-only root filesystem
- ✅ Auto-remove containers after execution
- ✅ Rate limiting (100 requests per 15 minutes)

## 🎯 Usage in Editor

1. Open editor at `http://localhost:3000/dashboard/editor`
2. Select a language from dropdown
3. Write or paste code
4. Click "Run" button
5. View output in bottom panel

### Execution Tiers

**Tier 1 (Executable)**: Full Docker execution
- Python, JavaScript, TypeScript, Java, C++, C, Go, Rust, PHP, Ruby, C#, Bash

**Tier 2 (AI-Assisted)**: Validation only
- SQL, HTML, CSS, Shell, YAML, JSON, GraphQL, Solidity

**Tier 3 (View-Only)**: Syntax highlighting
- Swift, Kotlin, Dart, Markdown, XML

## 🐛 Troubleshooting

### Service Not Starting
```bash
# Check if port 4001 is in use
lsof -i :4001

# Kill process if needed
kill -9 $(lsof -ti:4001)

# Restart service
cd code-executor && npm run dev
```

### Docker Not Connected
```bash
# Check Docker status
docker ps

# If Docker is not running, start it
# (method depends on your Docker installation)
```

### Code Execution Fails
1. Check service is running: `curl http://localhost:4001/health`
2. Check Docker is connected (should show "docker": "connected")
3. Check container logs in service output
4. Verify language is supported: `curl http://localhost:4001/api/languages`

### Frontend Can't Connect
1. Verify `.env.local` has: `NEXT_PUBLIC_CODE_EXECUTOR_URL=http://localhost:4001`
2. Restart Next.js dev server
3. Clear browser cache
4. Check browser console for CORS errors

## 📊 Monitoring

### Service Logs
The service outputs detailed logs including:
- Execution requests
- Docker operations
- Errors and warnings
- Performance metrics

### Check Running Service
```bash
# Find process
ps aux | grep "ts-node src/index.ts"

# Check port
lsof -i :4001

# View logs (if running in background)
# Check terminal where service was started
```

## 🎉 Success Indicators

When everything is working:
- ✅ Service health check returns status "ok"
- ✅ Docker shows "connected"
- ✅ Test execution completes successfully
- ✅ Editor shows execution results
- ✅ No CORS errors in browser console

## 📞 Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Review service logs for errors
3. Verify all configuration files
4. Ensure Docker is running and accessible
5. Check that port 4001 is not blocked by firewall

---

**Last Updated**: 2025-10-12
**Service Version**: 1.0.0
**Status**: ✅ Operational
