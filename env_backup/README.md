# Environment Variables Backup

This folder contains all the environment variables recovered from git history after OS change.

## Files:
- `.env.main` - Main application environment variables
- `.env.backend` - Backend specific variables  
- `.env.frontend` - Frontend specific variables
- `.env.supabase` - Supabase configuration
- `.env.api_keys` - All API keys

## Usage:
Copy the appropriate files to their locations:
- `.env.main` → root `.env`
- `.env.backend` → `backend/.env`
- `.env.frontend` → `frontend/.env.local`

## Recovered Keys:
- ✅ Supabase URL and keys
- ✅ GROQ API key
- ✅ Gemini API key (from security audit)
- ✅ S3 access credentials
- ✅ MongoDB configuration