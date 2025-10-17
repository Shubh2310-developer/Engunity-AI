# Lazy Loading Service Architecture Guide

## Overview

The Engunity AI platform now supports **lazy loading** of backend services to optimize memory usage and startup time. Services are only started when needed by specific dashboard features.

## Architecture

### Core Services (Always Running)
- **Main Backend** (Port 8000) - Essential API server
- **MongoDB** (Port 27017) - Database
- **Frontend** - Next.js application

### On-Demand Services (Lazy Loaded)
| Service | Port | Started For | Memory | Startup Time |
|---------|------|-------------|---------|--------------|
| **Hybrid RAG v3** | 8002 | Document Analysis, Document Q&A | ~800MB | ~10s |
| **Citation Classifier** | 8003 | Research Analysis | ~600MB | ~15s |
| **Agentic RAG** | 8001 | Advanced Chat, Code & Chat | ~700MB | ~12s |
| **Code Executor** | 4001 | Code Editor | ~400MB | ~8s |

## Quick Start

### Start in Minimal Mode (Recommended)

```bash
./start-minimal.sh
```

This starts only the main backend. Other services auto-start when you access their features.

### Start All Services (Traditional)

```bash
./start-all-services.sh
```

This starts all services immediately (requires more RAM).

### Stop Services

```bash
./stop-minimal.sh
```

## How It Works

### 1. User Navigation
When you navigate to a dashboard feature:
- **Documents** → Triggers Hybrid RAG v3
- **Research** → Triggers Citation Classifier
- **Code Editor** → Triggers Code Executor
- **Advanced Chat** → Triggers Agentic RAG

### 2. Automatic Service Loading
The frontend automatically:
1. Checks if required services are running
2. Starts them if needed via API call
3. Shows loading progress to user
4. Renders feature when services are ready

### 3. Service Persistence
Once started, services remain running until:
- Manually stopped
- System restart
- Application shutdown

## API Endpoints

### Service Management API

#### Get All Services Status
```bash
curl http://localhost:8000/api/services/status
```

Response:
```json
[
  {
    "service_id": "hybrid_rag",
    "name": "Hybrid RAG v3",
    "status": "running",
    "port": 8002,
    "pid": 12345,
    "uptime": 300,
    "memory_mb": 750
  }
]
```

#### Start a Service
```bash
curl -X POST http://localhost:8000/api/services/start/hybrid_rag
```

#### Stop a Service
```bash
curl -X POST http://localhost:8000/api/services/stop/hybrid_rag
```

#### Start Services for Feature
```bash
curl -X POST http://localhost:8000/api/services/start-for-feature \
  -H "Content-Type: application/json" \
  -d '{"feature": "documents"}'
```

#### Get Required Services for Feature
```bash
curl http://localhost:8000/api/services/required-for/documents
```

## Frontend Integration

### Using ServiceLoader Component

Wrap your page with the `ServiceLoader` component:

```tsx
import ServiceLoader from '@/components/services/ServiceLoader';

export default function DocumentsPage() {
  return (
    <ServiceLoader feature="documents">
      {/* Your page content */}
      <div>Document analysis interface</div>
    </ServiceLoader>
  );
}
```

### Using the Hook

For more control, use the `useServiceLoader` hook:

```tsx
import { useServiceLoader } from '@/components/services/ServiceLoader';

export function MyComponent() {
  const { loading, error, progress, message } = useServiceLoader('research');

  if (loading) {
    return <div>Loading: {message} ({progress}%)</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>Services ready!</div>;
}
```

## Feature-Service Mapping

| Dashboard Feature | Required Services | Total Memory | Startup Time |
|-------------------|------------------|--------------|--------------|
| **Dashboard Home** | None | 0MB | Instant |
| **Documents** | Hybrid RAG v3 | ~800MB | ~10s |
| **Document Q&A** | Hybrid RAG v3 | ~800MB | ~10s |
| **Research** | Citation Classifier | ~600MB | ~15s |
| **Code Editor** | Code Executor | ~400MB | ~8s |
| **Chat & Code** | Agentic RAG | ~700MB | ~12s |
| **Advanced Chat** | Agentic RAG | ~700MB | ~12s |

## Benefits

### Memory Optimization
- **Before**: All services always running → ~3GB RAM
- **After**: Only main backend → ~300MB RAM
- **On-Demand**: Services load as needed → 300MB-2GB RAM

### Faster Startup
- **Before**: 30-60 seconds to start all services
- **After**: 5-10 seconds for main backend
- **Total**: Same experience, but distributed over time

### Better Resource Management
- Services only run when actually needed
- Can run on systems with limited RAM
- Reduced idle resource consumption

## Troubleshooting

### Service Won't Start

**Check logs:**
```bash
tail -f backend/{service}_server.log
```

**Check available memory:**
```bash
free -h
```

**Manual start:**
```bash
cd backend
/home/ghost/anaconda3/envs/engunity/bin/python servers/hybrid_rag_v3_server.py
```

### Service Stuck in "Starting"

**Check if port is blocked:**
```bash
lsof -i :{port}
```

**Kill and restart:**
```bash
lsof -ti:{port} | xargs kill -9
curl -X POST http://localhost:8000/api/services/start/{service_id}
```

### Out of Memory

**Check current usage:**
```bash
curl http://localhost:8000/api/services/status
```

**Stop unused services:**
```bash
curl -X POST http://localhost:8000/api/services/stop/agentic_rag
```

## Configuration

### Modify Service Config

Edit `backend/service_manager.py`:

```python
SERVICE_CONFIG = {
    "hybrid_rag": {
        "name": "Hybrid RAG v3",
        "port": 8002,
        "script": "servers/hybrid_rag_v3_server.py",
        "health_endpoint": "/health",
        "startup_time": 10,  # Adjust based on your system
        "python_path": "/home/ghost/anaconda3/envs/engunity/bin/python",
        "log_file": "hybrid_rag_v3_server.log",
        "required_for": ["documents", "document_qa"],  # Add features here
        "memory_mb": 800  # Adjust based on actual usage
    }
}
```

### Add New Service

1. Add to `SERVICE_CONFIG` in `backend/service_manager.py`
2. Map features in `required_for` array
3. Update `FEATURE_SERVICE_MAP` in `frontend/src/lib/services/serviceLoader.ts`

## Monitoring

### Check Service Status Dashboard

Visit: `http://localhost:8000/api/services/status`

### Monitor Memory Usage

```bash
watch -n 2 'curl -s http://localhost:8000/api/services/status | jq'
```

### View All Logs

```bash
tail -f backend/*.log
```

## Best Practices

1. **Use Minimal Mode** for development and low-RAM systems
2. **Use Full Mode** for production or high-traffic environments
3. **Monitor memory** and stop unused services
4. **Check logs** if services fail to start
5. **Allow 10-30s** for first-time service initialization

## Migration from Old System

### Before (start-all-services.sh)
- All services start immediately
- High initial memory usage
- Longer startup time

### After (start-minimal.sh)
- Only main backend starts
- Low initial memory usage
- Fast startup time
- Services auto-load on demand

**No code changes needed** - the frontend automatically handles service loading!

## Performance Tips

1. **Keep main backend running** - it's lightweight and essential
2. **Stop unused services** after you're done with features
3. **Monitor memory** - stop services if system is slow
4. **Use SSD** for faster service startup
5. **Increase RAM** for running all services simultaneously

## Support

For issues or questions:
- Check logs in `backend/*.log`
- Check service status API
- Review this guide
- Check system resources (RAM, disk)

---

**Last Updated**: 2025-01-13
**Version**: 1.0.0
