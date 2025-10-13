# Engunity AI Code Editor - Complete Setup Guide

This guide will help you set up the complete Engunity AI Code Editor with fully functional backend, database, and frontend integration.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Engunity AI Code Editor                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────┐ │
│  │   Frontend   │◄────►│   Backend    │◄────►│ MongoDB  │ │
│  │  (Next.js)   │      │  (Express)   │      │          │ │
│  │   Port 3000  │      │  Port 4000   │      │ Port     │ │
│  │              │      │              │      │ 27017    │ │
│  └──────────────┘      └──────────────┘      └──────────┘ │
│         │                      │                           │
│         │                      │                           │
│         │              ┌───────▼─────────┐                 │
│         │              │ Docker Executor │                 │
│         └──────────────│ (Code Sandbox)  │                 │
│           WebSocket    └─────────────────┘                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

Ensure you have the following installed:

- ✅ **Node.js 20+** ([Download](https://nodejs.org/))
- ✅ **Docker & Docker Compose** ([Download](https://www.docker.com/get-started))
- ✅ **Git** ([Download](https://git-scm.com/))

## Quick Start (Recommended)

### 1. Clone Repository (if not already done)

```bash
cd /home/ghost/engunity-ai
```

### 2. Setup Environment Variables

#### Backend (.env)
```bash
cd code-executor
cp .env.example .env
```

Edit `code-executor/.env`:
```env
PORT=4000
NODE_ENV=development
MONGODB_URI=mongodb://mongo:27017/engunity-code-editor
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
MAX_EXECUTION_TIME=30000
MAX_MEMORY_MB=512
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env.local)
```bash
cd ../frontend
```

Create `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

### 3. Install Dependencies

#### Backend
```bash
cd ../code-executor
npm install
```

#### Frontend
```bash
cd ../frontend
npm install
```

### 4. Start with Docker Compose (Recommended)

From the root directory:

```bash
cd /home/ghost/engunity-ai
docker-compose up -d
```

This starts:
- ✅ MongoDB on port 27017
- ✅ Code Executor Backend on port 4000
- ✅ Frontend on port 3000

### 5. Access the Application

- 🌐 **Frontend**: http://localhost:3000
- 🔌 **Backend API**: http://localhost:4000/api
- 📊 **Health Check**: http://localhost:4000/health

## Manual Setup (Alternative)

If you prefer to run services individually:

### 1. Start MongoDB

```bash
docker run -d \
  --name engunity-mongo \
  -p 27017:27017 \
  -v mongo_data:/data/db \
  mongo:7.0
```

### 2. Start Backend

```bash
cd code-executor
npm run dev
```

You should see:
```
🚀 Server running on port 4000
📝 API: http://localhost:4000/api
🔌 WebSocket: ws://localhost:4000
🐳 Docker: Connected
```

### 3. Start Frontend

```bash
cd frontend
npm run dev
```

You should see:
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

## Testing the Setup

### 1. Test Backend Health

```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-11T...",
  "docker": "connected",
  "mongodb": "connected"
}
```

### 2. Test Code Execution

```bash
curl -X POST http://localhost:4000/api/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello from Engunity AI!\")",
    "language": "python"
  }'
```

Expected response:
```json
{
  "success": true,
  "output": "Hello from Engunity AI!\n",
  "error": "",
  "executionTime": 245,
  "exitCode": 0,
  "status": "success"
}
```

### 3. Test Frontend

1. Open http://localhost:3000/dashboard/editor
2. Write some Python code:
   ```python
   print("Hello, World!")
   for i in range(5):
       print(f"Number {i}")
   ```
3. Click the "Run" button
4. You should see the output in the Output panel

## Features

### ✅ Code Execution
- Multi-language support (Python, JavaScript, TypeScript, Java, C++, C, Go, Rust)
- Real-time output streaming via WebSocket
- Secure Docker sandboxing
- Execution timeout and memory limits

### ✅ Code Editor
- Monaco Editor (VS Code engine)
- Syntax highlighting for all languages
- 9 built-in themes (Dracula, Monokai, One Dark Pro, etc.)
- Code templates library (17+ templates)
- Auto-save functionality

### ✅ Project Management
- Create, save, and load projects
- Multi-file support
- Version history (coming soon)
- Cloud sync (coming soon)

### ✅ Authentication
- JWT-based authentication
- User registration and login
- Project ownership and permissions

## Development Workflow

### Backend Development

```bash
cd code-executor

# Run in development mode (auto-reload)
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

### Frontend Development

```bash
cd frontend

# Run development server
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

### Docker Development

```bash
# Build and start all services
docker-compose up --build

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Remove volumes (reset database)
docker-compose down -v
```

## Troubleshooting

### Issue: "Cannot connect to Docker"

**Solution:**
```bash
# Check Docker is running
docker ps

# Restart Docker service
sudo systemctl restart docker

# Check permissions
sudo usermod -aG docker $USER
newgrp docker
```

### Issue: "MongoDB connection failed"

**Solution:**
```bash
# Check MongoDB is running
docker ps | grep mongo

# Restart MongoDB
docker restart engunity-mongo

# Check connection
mongosh mongodb://localhost:27017
```

### Issue: "Port 3000/4000 already in use"

**Solution:**
```bash
# Find process using port
lsof -i :3000
lsof -i :4000

# Kill process
kill -9 <PID>

# Or change port in .env files
```

### Issue: "Code execution fails"

**Solution:**
1. Check Docker images are available:
   ```bash
   docker images | grep -E "python|node|gcc|golang|rust"
   ```

2. Pull required images:
   ```bash
   docker pull python:3.11-slim
   docker pull node:20-slim
   docker pull openjdk:21-slim
   docker pull gcc:latest
   docker pull golang:1.21-alpine
   docker pull rust:latest
   ```

### Issue: "WebSocket connection failed"

**Solution:**
1. Check backend is running on port 4000
2. Verify `NEXT_PUBLIC_WS_URL` in frontend `.env.local`
3. Check browser console for WebSocket errors
4. Ensure firewall allows port 4000

## Production Deployment

### Environment Variables

Set these in production:

```env
# Backend
NODE_ENV=production
MONGODB_URI=<your-production-mongodb-uri>
JWT_SECRET=<strong-random-secret>
FRONTEND_URL=<your-production-frontend-url>

# Frontend
NEXT_PUBLIC_API_URL=<your-production-api-url>
NEXT_PUBLIC_WS_URL=<your-production-ws-url>
```

### Recommended Platforms

- **Frontend**: Vercel, Netlify, or AWS Amplify
- **Backend**: AWS ECS, Render, Railway, or DigitalOcean App Platform
- **Database**: MongoDB Atlas (free tier available)

### Security Checklist

- ✅ Change JWT_SECRET to a strong random value
- ✅ Use HTTPS for production
- ✅ Enable rate limiting
- ✅ Set up firewall rules
- ✅ Use environment variables for secrets
- ✅ Enable MongoDB authentication
- ✅ Regular security updates

## API Documentation

Full API documentation is available at:
- [Backend README](code-executor/README.md)

### Quick API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/execute` | POST | Execute code |
| `/api/auth/register` | POST | Register user |
| `/api/auth/login` | POST | Login user |
| `/api/projects` | GET | List projects |
| `/api/projects` | POST | Create project |
| `/api/projects/:id` | GET | Get project |
| `/api/projects/:id` | PUT | Update project |
| `/api/projects/:id` | DELETE | Delete project |
| `/health` | GET | Health check |

## Next Steps

Now that your setup is complete:

1. ✅ Test code execution with different languages
2. ✅ Try different editor themes (Settings > Theme)
3. ✅ Explore code templates (Templates button)
4. ✅ Create and save projects
5. ✅ Register a user account
6. ✅ Customize the editor settings

## Support

- 📧 Issues: https://github.com/anthropics/engunity-ai/issues
- 📖 Documentation: Check README files in each directory
- 💬 Questions: Open a GitHub Discussion

## License

MIT License - See LICENSE file for details
