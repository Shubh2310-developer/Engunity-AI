# Engunity AI - Quick Start Guide

## 🚀 Get Started in 30 Seconds

### Start All Services
```bash
./start-all-services.sh
```

### Verify Everything Works
```bash
./verify-services.sh
```

### Access Your Platform
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000/api
- **Code Executor:** http://localhost:4001/api

## 🎯 What Just Happened?

The `start-all-services.sh` script automatically:
- ✅ Cleaned all ports (no more "port in use" errors)
- ✅ Started Main Backend on port 8000
- ✅ Started Hybrid RAG on port 8002
- ✅ Started Code Executor on port 4001
- ✅ Started Frontend on port 3000
- ✅ Verified MongoDB is running
- ✅ Performed health checks on all services

## 📊 Service Overview

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| Frontend | 3000 | Next.js UI | ✅ Running |
| Backend | 8000 | FastAPI Core | ✅ Running |
| Hybrid RAG | 8002 | Document Q&A | ✅ Running |
| Code Executor | 4001 | Code Sandbox | ✅ Running |
| MongoDB | 27017 | Database | ✅ Running |

## 🛠️ Common Commands

### Start/Stop Services
```bash
./start-all-services.sh    # Start everything
./stop-all-services.sh     # Stop everything
./verify-services.sh       # Check status
```

### Frontend Only
```bash
cd frontend
npm run dev               # Port 3000 auto-cleaned
```

### View Logs
```bash
tail -f frontend/frontend.log              # Frontend logs
tail -f backend/main_backend.log           # Backend logs
tail -f code-executor/code-executor.log    # Code executor logs
```

## 🎨 Features

### ✅ Automatic Port Cleanup
No more `EADDRINUSE` errors! Ports are automatically cleaned before starting services.

### ✅ Memory Optimized
- Total RAM usage: ~1.9GB
- 32% reduction from original setup
- Optimized for best performance

### ✅ One-Command Startup
Everything starts with a single command - no manual setup needed.

### ✅ Health Monitoring
Automatic health checks ensure all services are running correctly.

## 📚 Documentation

Need more details? Check out:

- **[COMPLETE_STARTUP_GUIDE.md](COMPLETE_STARTUP_GUIDE.md)** - Complete usage guide (700+ lines)
- **[PORT_CLEANUP_GUIDE.md](PORT_CLEANUP_GUIDE.md)** - Port cleanup system details
- **[OPTIMIZATION_SUMMARY.md](OPTIMIZATION_SUMMARY.md)** - Optimization results
- **[IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md)** - What was built
- **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** - Production setup guide

## 🔧 Troubleshooting

### Port Already in Use?
```bash
./stop-all-services.sh && ./start-all-services.sh
```

### Service Not Responding?
```bash
./verify-services.sh       # Check which services are down
tail -f frontend/frontend.log  # Check logs
```

### Low Memory?
```bash
free -h                    # Check available memory
# Script auto-enters lightweight mode if <2GB available
```

## 💡 Tips

1. **Always use start-all-services.sh** - It handles cleanup automatically
2. **Check logs if issues occur** - They're in each service directory
3. **Run verify-services.sh** - Quick health check anytime
4. **MongoDB stays running** - Even after stopping services (for data persistence)

## 🎉 You're Ready!

Your Engunity AI platform is now fully operational with:
- ✅ Automatic port management
- ✅ Memory optimization
- ✅ Professional error handling
- ✅ Complete logging
- ✅ Health monitoring

**Start building amazing things!** 🚀

---

**Quick Links:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- API Health: http://localhost:8000/api/health
- Code Executor: http://localhost:4001/api

**Need Help?** Check [COMPLETE_STARTUP_GUIDE.md](COMPLETE_STARTUP_GUIDE.md) for detailed instructions.
