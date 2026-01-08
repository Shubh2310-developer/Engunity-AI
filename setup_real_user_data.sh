#!/bin/bash

# Setup Script for Real User Data Implementation
# Run this script to set up the new real user data system

echo "🚀 Setting up Real User Data Implementation for Engunity AI"
echo "================================================================"

# Create backup of current .env
if [ -f backend/.env ]; then
    echo "📦 Backing up existing .env file..."
    cp backend/.env backend/.env.backup.$(date +%Y%m%d_%H%M%S)
fi

# Copy enhanced environment template
echo "⚙️ Setting up enhanced environment configuration..."
if [ -f backend/.env.example.enhanced ]; then
    if [ ! -f backend/.env ]; then
        cp backend/.env.example.enhanced backend/.env
        echo "✅ Created new .env from enhanced template"
    else
        echo "⚠️ .env already exists. Please manually merge backend/.env.example.enhanced"
    fi
fi

# Install any missing Python dependencies
echo "📦 Installing Python dependencies..."
cd backend
pip install motor pymongo python-multipart aiofiles
cd ..

# Install any missing Node.js dependencies  
echo "📦 Installing Node.js dependencies..."
cd frontend
npm install
cd ..

# Create MongoDB indexes
echo "🗄️ Setting up MongoDB indexes..."
cat << 'EOF' > setup_mongodb_indexes.py
#!/usr/bin/env python3
"""
Setup MongoDB indexes for real user data
"""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def setup_indexes():
    """Create necessary indexes for user data collections"""
    
    # Connect to MongoDB
    mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
    db_name = os.getenv('DATABASE_NAME', 'engunity-ai')
    
    client = AsyncIOMotorClient(mongodb_uri)
    db = client[db_name]
    
    print("🔍 Creating indexes for user data collections...")
    
    try:
        # Research documents indexes
        await db.research_documents.create_index([("user_id", 1), ("created_at", -1)])
        await db.research_documents.create_index([("document_id", 1)], unique=True)
        await db.research_documents.create_index([("status", 1)])
        print("✅ Research documents indexes created")
        
        # Chat history indexes  
        await db.chat_history.create_index([("user_id", 1), ("created_at", -1)])
        await db.chat_history.create_index([("document_id", 1)])
        print("✅ Chat history indexes created")
        
        # Analysis sessions indexes
        await db.analysis_sessions.create_index([("user_id", 1), ("created_at", -1)])
        await db.analysis_sessions.create_index([("user_id", 1), ("status", 1)])
        print("✅ Analysis sessions indexes created")
        
        # User profiles indexes
        await db.user_profiles.create_index([("user_id", 1)], unique=True)
        print("✅ User profiles indexes created")
        
        # Projects indexes
        await db.projects.create_index([("user_id", 1), ("created_at", -1)])
        print("✅ Projects indexes created")
        
        print("\n🎉 All MongoDB indexes created successfully!")
        
    except Exception as e:
        print(f"❌ Error creating indexes: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(setup_indexes())
EOF

# Run MongoDB index setup
echo "🔧 Running MongoDB index setup..."
cd backend
python setup_mongodb_indexes.py
cd ..

# Clean up temporary file
rm setup_mongodb_indexes.py

echo ""
echo "✅ Real User Data Implementation Setup Complete!"
echo "================================================================"
echo ""
echo "🔧 Next Steps:"
echo "1. Update backend/.env with your actual credentials:"
echo "   - SUPABASE_URL, SUPABASE_KEY, SUPABASE_JWT_SECRET"
echo "   - MONGODB_URI (if different from localhost)"
echo "   - GROQ_API_KEY (for AI features)"
echo ""
echo "2. Choose your authentication mode in backend/.env:"
echo "   - USE_MOCK_AUTH=false (for production with real users)"
echo "   - USE_MOCK_AUTH=true (for development/testing)"
echo ""
echo "3. Configure mock data fallback in backend/.env:"
echo "   - USE_MOCK_FALLBACK=true (recommended for development)"
echo "   - USE_MOCK_FALLBACK=false (for production)"
echo ""
echo "🚀 Start the services:"
echo "   Backend:  cd backend && python main.py"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "📊 Test the new features:"
echo "   - Visit /dashboard/research to see the real data dashboard"
echo "   - Use the mock/real data toggle in the UI"
echo "   - Check data sources in developer console"
echo ""
echo "🎯 Key endpoints to test:"
echo "   GET  /api/v1/user/dashboard?use_mock=false"
echo "   GET  /api/v1/user/statistics"
echo "   GET  /api/v1/user/insights"
echo "   POST /api/v1/user/toggle-mock-mode"
echo ""
echo "📚 For more details, see: REAL_USER_DATA_IMPLEMENTATION_COMPLETE.md"