# 🚀 Memory Optimization Guide

## Quick Start

```bash
# Start services (auto-optimized)
./start-all-services.sh

# Check memory usage
./monitor-memory.sh

# Stop all services
./stop-all-services.sh
```

## Optimizations Applied

### 1. **Automatic Lightweight Mode**
- Detects available RAM at startup
- If RAM < 2GB available → Skips ML services
- Saves ~1.5GB of RAM

### 2. **Resource Limits**
```bash
export MALLOC_ARENA_MAX=2           # Reduces Python memory
export PYTHONOPTIMIZE=1             # Faster Python execution
export NODE_OPTIONS="--max-old-space-size=512"  # Limits Node.js heap
```

### 3. **Service Prioritization**

**Essential (Always Run):**
- Main Backend (Port 8000)
- Code Executor (Port 4001)

**Optional (Skipped in Lightweight):**
- Hybrid RAG v3 (Port 8002)
- Agentic RAG (Port 8001)
- Citation Classifier (Port 8003)

## Memory Usage

| Mode | Services | RAM Usage |
|------|----------|-----------|
| **Full** | All 5 services | ~1.6-2.5GB |
| **Lightweight** | 2 essential only | ~300-500MB |

## Troubleshooting

### System Running Out of Memory?
```bash
# Check status
./monitor-memory.sh

# If critical, stop optional services
pkill -f "agentic_rag_server.py"
pkill -f "citation_classification_server.py"
pkill -f "hybrid_rag_v3_server.py"

# Or restart in lightweight mode
./stop-all-services.sh
./start-all-services.sh
```

### Services Crashing?
1. Check logs: `tail -f backend/*.log`
2. Check RAM: `free -h`
3. Restart with lower footprint: `./start-all-services.sh`

## Tips

- **Monitor continuously:** `watch -n 5 ./monitor-memory.sh`
- **Close Chrome/VS Code** to free RAM before starting
- **Restart system** if swap usage is high
- **Upgrade RAM** to 16GB+ for full feature set

## Files Modified

- ✅ `start-all-services.sh` - Optimized startup with RAM detection
- ✅ `monitor-memory.sh` - New memory monitoring tool
- ✅ `stop-all-services.sh` - Already optimized

---

**Last Updated:** October 2025
