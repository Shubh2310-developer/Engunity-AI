# 🚀 Engunity AI - Getting Started

Welcome to Engunity AI! This guide will help you start the application quickly.

## ⚡ Quick Start (TL;DR)

```bash
./start-app.sh
```

Then open **http://localhost:3000** in your browser! 🎉

## 📋 Available Startup Scripts

### 1. `start-app.sh` ⭐ **RECOMMENDED**
Starts everything (backend + frontend) in one command.

```bash
./start-app.sh
```

**When to use:**
- ✅ Quick development/testing
- ✅ Single terminal preferred
- ✅ Complete application needed

### 2. `start-minimal.sh`
Starts only backend with lazy loading.

```bash
./start-minimal.sh
```

**When to use:**
- Backend-only development
- Want to run frontend separately
- Testing backend services

### 3. `start-all-services.sh`
Starts all services immediately (no lazy loading).

```bash
./start-all-services.sh
```

**When to use:**
- ⚠️ Production environment
- System has plenty of RAM (>6GB)
- Want all services pre-loaded

## 🛑 Stopping the Application

### Stop Everything:
```bash
./stop-app.sh
```

### Stop Specific Mode:
```bash
# If using start-minimal.sh
./stop-minimal.sh

# If using start-all-services.sh
./stop-all-services.sh
```

## 🎯 What Gets Started

### With `start-app.sh`:
| Component | Port | Status |
|-----------|------|--------|
| Backend API | 8000 | ✅ Started |
| Frontend | 3000 | ✅ Started |
| MongoDB | 27017 | ✅ Running |
| Hybrid RAG | 8002 | 🔄 On-demand |
| Citation Classifier | 8003 | 🔄 On-demand |
| Code Executor | 4001 | 🔄 On-demand |
| Agentic RAG | 8001 | 🔄 On-demand |

**🔄 On-demand** = Loads automatically when you use the feature

## 📚 Documentation

- **[QUICK_START_LAZY_LOADING.md](QUICK_START_LAZY_LOADING.md)** - Detailed quick start guide
- **[LAZY_LOADING_GUIDE.md](LAZY_LOADING_GUIDE.md)** - Complete technical documentation
- **[SETUP.md](SETUP.md)** - Installation and configuration

## 🎨 Accessing the Application

Once started, access:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Service Status**: http://localhost:8000/api/services/status

## 💡 Features & Services

| Dashboard Feature | Auto-loads Service | Startup Time |
|------------------|-------------------|--------------|
| **Home Dashboard** | None | Instant |
| **Documents** | Hybrid RAG v3 | ~10 seconds |
| **Research** | Citation Classifier | ~15 seconds |
| **Code Editor** | Code Executor | ~8 seconds |
| **Chat & Code** | Agentic RAG | ~12 seconds |
| **Projects** | None | Instant |
| **Analysis** | None | Instant |

## 🔧 Requirements

### Essential:
- Python 3.10+ with Anaconda
- Node.js 18+
- MongoDB
- 4GB+ RAM (8GB recommended)

### Optional:
- Docker (for Code Editor)
- 16GB RAM (for all services running)

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Kill process on port
lsof -ti:8000 | xargs kill -9
```

### Service Won't Start
```bash
# Check logs
tail -f backend/main_backend.log

# Check memory
free -h
```

### Out of Memory
```bash
# Stop unused services
curl -X POST http://localhost:8000/api/services/stop/agentic_rag
```

### Frontend Not Loading
```bash
# Check if running
curl http://localhost:3000

# Check logs
tail -f frontend/frontend.log

# Reinstall dependencies
cd frontend && rm -rf node_modules && npm install
```

## 📊 Memory Usage

| Mode | Initial RAM | With All Services |
|------|-------------|-------------------|
| **Lazy Loading** (start-app.sh) | ~300MB | ~2GB |
| **Full Mode** (start-all-services.sh) | ~3GB | ~3GB |

## 🎯 Recommended Workflow

### Development:
```bash
./start-app.sh
# Edit code
# Changes auto-reload
# Ctrl+C to stop
./stop-app.sh
```

### Production:
```bash
./start-all-services.sh
# All services pre-loaded
# Zero wait time for any feature
```

## 📞 Support

- **Logs**: Check `backend/*.log` and `frontend/frontend.log`
- **Service Status**: `curl http://localhost:8000/api/services/status`
- **System Resources**: `free -h` and `top`

## 🚀 Next Steps

1. Run `./start-app.sh`
2. Open http://localhost:3000
3. Log in or sign up
4. Navigate to any feature
5. Services load automatically! 🎉

---

**Happy coding!** 💻✨

For detailed documentation, see:
- [QUICK_START_LAZY_LOADING.md](QUICK_START_LAZY_LOADING.md)
- [LAZY_LOADING_GUIDE.md](LAZY_LOADING_GUIDE.md)
