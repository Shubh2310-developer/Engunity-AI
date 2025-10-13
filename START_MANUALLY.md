# Start Engunity AI Manually

## Issue: MongoDB Port 27017 Already in Use

Since port 27017 is occupied, we'll use port 27018 for MongoDB.

## Step-by-Step Instructions

### 1. Remove Conflicting MongoDB Container

```bash
sudo docker rm -f engunity-mongo
```

### 2. Start MongoDB on Port 27018

```bash
sudo docker run -d --name engunity-mongo -p 27018:27017 mongo:7.0
```

Verify it's running:
```bash
sudo docker ps | grep mongo
```

### 3. Update Backend Configuration

Edit `code-executor/.env`:
```bash
nano code-executor/.env
```

Change this line:
```env
MONGODB_URI=mongodb://localhost:27017/engunity-code-editor
```

To:
```env
MONGODB_URI=mongodb://localhost:27018/engunity-code-editor
```

Save with `Ctrl+O`, `Enter`, `Ctrl+X`

### 4. Start Backend (Terminal 1)

```bash
cd ~/engunity-ai/code-executor
npm run dev
```

Wait for:
```
🚀 Server running on port 4000
📝 API: http://localhost:4000/api
🐳 Docker: Connected
```

### 5. Start Frontend (Terminal 2)

Open a new terminal:
```bash
cd ~/engunity-ai/frontend
npm run dev
```

Wait for:
```
▲ Next.js ready
- Local: http://localhost:3000
```

### 6. Access the Application

Open browser: **http://localhost:3000/dashboard/editor**

---

## Alternative: Skip MongoDB (Frontend Only)

If you just want to test the UI without code execution:

```bash
cd ~/engunity-ai/frontend
npm run dev
```

Then visit: http://localhost:3000/dashboard/editor

The editor will work but "Run Code" won't execute until backend is running.

---

## Troubleshooting

### MongoDB Won't Start
```bash
# Check what's using port 27017
sudo netstat -tulpn | grep 27017

# Kill the process
sudo kill -9 <PID>

# Or use port 27018 as shown above
```

### Docker Socket Error
```bash
# Check Docker Desktop is running
ps aux | grep docker

# Restart Docker Desktop
# (Use GUI or systemctl)
```

### Backend Connection Failed
```bash
# Verify MongoDB is accessible
mongosh mongodb://localhost:27018

# Check backend logs for errors
cd code-executor && npm run dev
```

---

## Quick Test

Once everything is running, test code execution:

```bash
curl -X POST http://localhost:4000/api/execute \
  -H "Content-Type: application/json" \
  -d '{"code": "print(\"Hello Engunity!\")", "language": "python"}'
```

Expected response:
```json
{
  "success": true,
  "output": "Hello Engunity!\n",
  "status": "success"
}
```

---

## Success Checklist

- [ ] MongoDB running on port 27018
- [ ] Backend running on port 4000 (shows "Docker: Connected")
- [ ] Frontend running on port 3000
- [ ] Can access http://localhost:3000/dashboard/editor
- [ ] Can type code in editor
- [ ] "Run Code" button works and shows output

---

## Need Help?

See full documentation:
- SETUP.md - Complete setup guide
- QUICK_START.txt - Quick reference
- code-executor/README.md - Backend API docs
