# Quick Start - Lazy Loading Mode

## 🚀 Start Your Application

### ⭐ Option 1: One-Command Start (Recommended)
```bash
cd /home/ghost/engunity-ai
./start-app.sh
```

This starts **everything**:
- ✅ Backend (Port 8000) - ~300MB RAM
- ✅ Frontend (Port 3000)
- ✅ MongoDB (Port 27017)
- 🔄 Other services load on-demand

**Open http://localhost:3000 in your browser!**

### Option 2: Manual Start (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd /home/ghost/engunity-ai
./start-minimal.sh
```

**Terminal 2 - Frontend:**
```bash
cd /home/ghost/engunity-ai/frontend
npm run dev
```

## 🎯 How It Works

When you navigate to different features, services auto-load:

| You Visit | Service Loads | Time | Memory |
|-----------|--------------|------|---------|
| **Dashboard** | None | Instant | 0MB |
| **Documents** | Hybrid RAG v3 | ~10s | 800MB |
| **Research** | Citation Classifier | ~15s | 600MB |
| **Code Editor** | Code Executor | ~8s | 400MB |
| **Chat & Code** | Agentic RAG | ~12s | 700MB |

### First Time Loading
When you visit a feature for the first time, you'll see:
- 🔵 Loading screen with progress bar
- 📊 Service startup status
- ⏱️ Estimated time remaining

### Subsequent Visits
Services stay running, so:
- ✅ Instant access
- No loading screen
- Same performance as "full mode"

## 📊 Monitor Services

### Check Status
```bash
curl http://localhost:8000/api/services/status | jq
```

### Start Service Manually
```bash
curl -X POST http://localhost:8000/api/services/start/hybrid_rag
```

### Stop Service (Free Memory)
```bash
curl -X POST http://localhost:8000/api/services/stop/hybrid_rag
```

## 🛑 Stop Everything

### If using start-app.sh:
```bash
./stop-app.sh
```

### If using manual start:
```bash
./stop-minimal.sh
# Then stop frontend (Ctrl+C in frontend terminal)
```

### Stop individual services:
```bash
# Stop specific lazy-loaded service
curl -X POST http://localhost:8000/api/services/stop/code_executor

# Stop only backend
pkill -f "main.py"

# Stop only frontend
pkill -f "next dev"
```

## 💡 Tips

1. **First visit takes time** - Services need 10-30s to initialize
2. **Services persist** - Once loaded, they stay running
3. **Free up memory** - Stop unused services via API
4. **Check logs** - See `backend/*.log` for issues
5. **Docker required** - For Code Editor feature

## ⚙️ Which Mode to Use?

### Use Minimal Mode (./start-minimal.sh) When:
- 💾 RAM is limited (<4GB available)
- ⚡ You want fast startup
- 🎯 You're using specific features only
- 💻 Development/testing

### Use Full Mode (./start-all-services.sh) When:
- 🚀 RAM is plentiful (>6GB available)
- 🏢 Production environment
- 👥 Multiple users accessing different features
- ⏱️ You want zero wait time for any feature

## 🔧 Troubleshooting

### Service Won't Start
```bash
# Check logs
tail -f backend/hybrid_rag_v3_server.log

# Check memory
free -h

# Restart manually
cd backend
/home/ghost/anaconda3/envs/engunity/bin/python servers/hybrid_rag_v3_server.py
```

### Port Already in Use
```bash
# Find and kill process
lsof -ti:8002 | xargs kill -9

# Restart service
curl -X POST http://localhost:8000/api/services/start/hybrid_rag
```

### Out of Memory
```bash
# Stop unused services
curl -X POST http://localhost:8000/api/services/stop/agentic_rag
curl -X POST http://localhost:8000/api/services/stop/citation_classifier
```

## 📈 Memory Comparison

### Before (Full Mode)
```
Start: All services load → 3GB RAM used
Time: 30-60 seconds
```

### After (Minimal Mode)
```
Start: Only main backend → 300MB RAM used
Time: 5-10 seconds
On-Demand: Services load as needed → 300MB-2GB total
```

**Result**: Same functionality, better resource usage! 🎉

## 🆘 Need Help?

- Check [LAZY_LOADING_GUIDE.md](./LAZY_LOADING_GUIDE.md) for detailed docs
- View logs in `backend/*.log`
- Check service status API
- Verify system resources

---

**Ready to go!** Just run `./start-minimal.sh` and open http://localhost:3000
