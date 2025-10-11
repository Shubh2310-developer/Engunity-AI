# Development Setup Guide

## Quick Fix for Current Issues

### 1. Environment Variables Fixed
✅ **Fixed circular reference issue** in `.env.local`
✅ **Restored proper development values** 

### 2. Font Loading Issues
✅ **Updated Next.js config** to handle network timeouts gracefully
✅ **Added font optimization** settings

## Starting the Application

### Option 1: Quick Fix Script
```bash
./fix-startup.sh
```

### Option 2: Manual Steps

1. **Kill existing processes:**
```bash
pkill -f 'python.*server.py'
pkill -f 'next dev'
```

2. **Start MongoDB:**
```bash
sudo systemctl start mongod
```

3. **Start Backend (Terminal 1):**
```bash
cd backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

4. **Start Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
```

## Required API Keys

**⚠️ Important:** You need to replace placeholder API keys in `.env.local`:

```bash
# Replace these with your actual keys:
NEXT_PUBLIC_GROQ_API_KEY=gsk_your_actual_groq_key
GROQ_API_KEY=gsk_your_actual_groq_key
NEXT_PUBLIC_GEMINI_API_KEY=AIza_your_actual_gemini_key
GEMINI_API_KEY=AIza_your_actual_gemini_key

# And Supabase credentials:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_key
```

## Network Issues

If font loading fails, it's usually due to network connectivity. The app will still work - fonts will fall back to system defaults.

## Services Overview

- **Frontend**: http://localhost:3000
- **Main Backend**: http://localhost:8000
- **Enhanced RAG**: http://localhost:8002
- **MongoDB**: localhost:27017

## Troubleshooting

### Environment Variable Errors
- Ensure no circular references (${VAR} pointing to itself)
- Use actual values, not variable substitutions
- Keep `.env.local` out of git (already in .gitignore)

### Backend Connection Errors
- Check if ports 8000, 8001, 8002, 8003 are available
- Ensure Python dependencies are installed
- Check if MongoDB is running

### Font Loading Warnings
- These are network-related and won't break functionality
- Fonts will fallback to system fonts
- Can be safely ignored in development

## Clean Restart

```bash
# Stop all services
pkill -f 'python.*server'
pkill -f 'next dev'

# Clear caches
rm -rf frontend/.next
rm -rf backend/__pycache__

# Restart
./fix-startup.sh
```