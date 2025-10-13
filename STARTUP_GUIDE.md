# Engunity AI - Startup Guide

## 🚀 Quick Start (Recommended)

The easiest way to start all services:

```bash
./start-all-services.sh
```

This will:
- ✅ Start MongoDB on port 27018
- ✅ Start Backend API on port 4000
- ✅ Start Frontend on port 3000
- ✅ Create logs in `logs/` directory

**Access the app**: http://localhost:3000

---

## 🛑 Stop All Services

```bash
./stop-all-services.sh
```

This will safely stop:
- Frontend (Port 3000)
- Backend (Port 4000)
- MongoDB (Optional - prompts you)

---

## 🔧 Alternative: Manual Development Mode

If you prefer to run services in separate terminals:

```bash
./start-dev.sh
```

This interactive script helps you:
1. Start MongoDB (optional)
2. Shows commands for backend (separate terminal)
3. Starts frontend in current terminal

---

## 📊 Services Overview

### 1. Frontend (Next.js)
- **Port**: 3000
- **URL**: http://localhost:3000
- **Code Editor**: http://localhost:3000/dashboard/editor
- **Logs**: `logs/frontend.log`

### 2. Backend API (Express + TypeScript)
- **Port**: 4000
- **API Base**: http://localhost:4000/api
- **Health Check**: http://localhost:4000/health
- **Logs**: `logs/backend.log`
- **Features**:
  - Docker-based code execution
  - WebSocket real-time updates
  - JWT authentication
  - 8 programming languages support

### 3. MongoDB Database
- **Port**: 27018 (custom to avoid conflicts)
- **Connection**: `mongodb://localhost:27018/engunity-code-editor`
- **Container**: `engunity-mongo-27018`

---

## 🔑 Configured Services

All environment variables are already set in `.env.local`:

- ✅ **Supabase OAuth** - Production credentials configured
- ✅ **Firebase Integration** - Complete setup
- ✅ **Groq AI API** - For AI-powered features
- ✅ **Custom Backend** - Code execution & WebSocket
- ✅ **MongoDB** - User data & project storage

---

## 📝 Manual Startup (Advanced)

### Terminal 1: MongoDB
```bash
docker run -d --name engunity-mongo-27018 -p 27018:27017 mongo:7.0
```

### Terminal 2: Backend
```bash
cd code-executor
npm install  # First time only
npm run dev
```

### Terminal 3: Frontend
```bash
cd frontend
npm install  # First time only
npm run dev
```

---

## 🧪 Testing the Setup

### Test Backend Health
```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "ok",
  "docker": "connected",
  "mongodb": "connected"
}
```

### Test Frontend
```bash
curl http://localhost:3000
```

Expected: HTTP 200 OK

### Test Code Execution
Visit http://localhost:3000/dashboard/editor and try running:

```python
print("Hello from Engunity AI!")
```

---

## 📂 Project Structure

```
engunity-ai/
├── frontend/               # Next.js 14 application
│   ├── src/
│   │   ├── app/           # Pages & routes
│   │   ├── components/    # React components
│   │   ├── lib/           # Auth, Firebase, Supabase
│   │   └── hooks/         # Custom React hooks
│   └── .env.local         # ✅ Already configured
│
├── code-executor/         # Backend Express API
│   ├── src/
│   │   ├── routes/        # API endpoints
│   │   ├── services/      # Docker executor, AI services
│   │   ├── models/        # MongoDB models
│   │   └── middleware/    # Auth, logging
│   └── .env               # ✅ Already configured
│
├── logs/                  # Service logs (auto-created)
│   ├── frontend.log
│   └── backend.log
│
└── scripts/              # Startup & utility scripts
    ├── start-all-services.sh
    ├── stop-all-services.sh
    └── start-dev.sh
```

---

## 🐛 Troubleshooting

### Port Already in Use

**Port 3000 (Frontend)**:
```bash
lsof -ti :3000 | xargs kill -9
```

**Port 4000 (Backend)**:
```bash
lsof -ti :4000 | xargs kill -9
```

**Port 27018 (MongoDB)**:
```bash
docker stop engunity-mongo-27018
```

### Backend Won't Start

Check logs:
```bash
tail -f logs/backend.log
```

Common issues:
- MongoDB not running → Start MongoDB first
- TypeScript errors → `cd code-executor && npm install`
- Port in use → Kill process on port 4000

### Frontend Won't Start

Check logs:
```bash
tail -f logs/frontend.log
```

Common issues:
- Dependencies missing → `cd frontend && npm install`
- Port in use → Kill process on port 3000
- Environment variables → Check `frontend/.env.local`

### MongoDB Connection Issues

Verify MongoDB is running:
```bash
docker ps | grep mongo
```

If not running:
```bash
docker start engunity-mongo-27018
```

Or recreate:
```bash
docker rm engunity-mongo-27018
./start-all-services.sh
```

---

## 🔄 Restart All Services

Quick restart:
```bash
./stop-all-services.sh && ./start-all-services.sh
```

---

## 📊 Monitoring Logs

### Watch All Logs
```bash
# Terminal 1
tail -f logs/backend.log

# Terminal 2
tail -f logs/frontend.log
```

### Check Service Status
```bash
# Check what's running
ps aux | grep -E 'node|npm'

# Check ports in use
lsof -i :3000
lsof -i :4000
lsof -i :27018
```

---

## 🎯 Development Workflow

### Recommended Setup

1. **Start all services**:
   ```bash
   ./start-all-services.sh
   ```

2. **Open in browser**:
   - Main app: http://localhost:3000
   - Code editor: http://localhost:3000/dashboard/editor

3. **Monitor logs** (optional):
   ```bash
   tail -f logs/frontend.log logs/backend.log
   ```

4. **When done**:
   ```bash
   ./stop-all-services.sh
   ```

### Hot Reload

Both frontend and backend support hot reload:
- Edit frontend code → Browser auto-refreshes
- Edit backend code → API auto-restarts

---

## 🆘 Support

### View Documentation
- Frontend: http://localhost:3000/docs
- Backend API: http://localhost:4000/api/docs

### Logs Location
- Frontend: `logs/frontend.log`
- Backend: `logs/backend.log`

### Process IDs
- Frontend PID: `logs/frontend.pid`
- Backend PID: `logs/backend.pid`

---

## ✨ Features

### Code Editor
- **8 Programming Languages**: Python, JavaScript, TypeScript, Java, C++, Go, Rust, Ruby
- **Real-time Execution**: See output as code runs
- **Docker Sandboxing**: Secure isolated execution
- **Syntax Highlighting**: Monaco Editor (VS Code engine)
- **Multiple Themes**: Choose your preferred theme

### Authentication
- **Google OAuth**: Via Supabase
- **JWT Sessions**: Secure token-based auth
- **User Profiles**: Store preferences and projects

### AI Features
- **Code Generation**: Groq AI integration
- **Smart Suggestions**: Context-aware completions
- **Error Analysis**: AI-powered debugging help

---

**Ready to code!** 🚀

For issues or questions, check the logs first:
```bash
tail -f logs/*.log
```
