# 🚀 Engunity AI - Quick Start Guide

## What Changed?

Your system now uses **lazy loading** - services start **only when you need them**, saving memory and startup time!

## ⚡ Start Your System (Choose One)

### Option 1: Main Server Only (Recommended - 300MB RAM)
```bash
./start-main-only.sh
```
- Starts in 3 seconds
- Services load automatically when you use features  
- Perfect for development

### Option 2: All Services Immediately (2.5GB RAM)
```bash
./start-all-services.sh
```
- Takes 30-45 seconds
- All services ready instantly
- Use for production/testing

## 📱 How It Works

1. **Start main server** → Website loads instantly
2. **Click "Documents"** → Hybrid RAG loads automatically (~10s)
3. **Upload PDF & ask questions** → AI answers from your document!

### Feature Loading Times

| Feature | Service | Load Time |
|---------|---------|-----------|
| 📄 Documents Q&A | Hybrid RAG v3 | ~10s |
| 🔬 Research | Citation Classifier | ~15s |
| 💻 Code Editor | Code Executor | ~8s |
| 💬 Chat & Code | Agentic RAG | ~12s |

## 🔧 What's Fixed

- ✅ Database configuration (all routes use correct 'engunity-ai' database)
- ✅ Lazy loading system (services start on-demand)
- ✅ Service manager API (automatic service lifecycle)
- ✅ PDF text extraction utility created
- ⏳ Integration of PDF extraction with upload (next step)

## 🐛 Troubleshooting

### Service won't load?
```bash
# Check status
curl http://localhost:8000/api/services/status

# Check logs
tail -f backend/hybrid_rag_v3_server.log

# Restart service
curl -X POST http://localhost:8000/api/services/stop/hybrid_rag
curl -X POST http://localhost:8000/api/services/start/hybrid_rag
```

### MongoDB not running?
```bash
sudo systemctl start mongod
```

### Port already in use?
```bash
# Kill service on port 8002
lsof -ti:8002 | xargs kill -9
```

## 🎯 Next Steps

1. **Start main server**: `./start-main-only.sh`
2. **Start frontend**: `cd frontend && npm run dev` (if not running)
3. **Open browser**: `http://localhost:3000`
4. **Go to Documents**: Click "Documents" in sidebar
5. **Upload PDF**: Hybrid RAG will load automatically
6. **Ask questions**: Get AI answers from your document!

## 📚 Documentation

- **Lazy Loading Guide**: `LAZY_LOADING_GUIDE.md`
- **Quick Start**: `QUICK_START_LAZY_LOADING.md`
- **Service Logs**: `backend/*.log`

---

**Ready to go?** Run `./start-main-only.sh` and start building! 🚀
