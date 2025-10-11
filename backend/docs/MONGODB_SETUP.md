# MongoDB Atlas Setup for Chat Persistence

This guide will help you connect your Q&A chats to MongoDB Atlas for persistent storage.

## 🎯 Overview

The chat system now integrates with MongoDB Atlas to:
- **Persist all Q&A conversations** between users and the CS-Enhanced RAG system
- **Organize chats by document** - each document has its own chat history
- **Maintain chat sessions** - conversations are grouped into sessions
- **Auto-cleanup on document deletion** - when you delete a document, all associated chats are removed
- **Track comprehensive metadata** - confidence scores, processing times, source types, token usage

## 📋 Prerequisites

1. **MongoDB Atlas Account** - Sign up at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. **Node.js Project** - This is already set up in your Engunity AI frontend
3. **Environment Variables** - You'll need to configure connection strings

## 🚀 Setup Steps

### Step 1: Create MongoDB Atlas Cluster

1. **Sign up/Login** to MongoDB Atlas
2. **Create a new project** (e.g., "Engunity AI")
3. **Build a cluster**:
   - Choose **FREE tier** (M0 Sandbox) for development
   - Select your preferred **cloud provider and region**
   - Name your cluster (e.g., "engunity-ai-cluster")
4. **Create a database user**:
   - Go to Database Access → Add New Database User
   - Choose **Password** authentication
   - Username: `engunity-admin` (or your choice)
   - Password: Generate a secure password
   - Database User Privileges: **Read and write to any database**
5. **Configure Network Access**:
   - Go to Network Access → Add IP Address
   - For development: Add **0.0.0.0/0** (allow from anywhere)
   - For production: Add your specific server IPs

### Step 2: Get Connection String

1. **Connect to cluster**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Driver: **Node.js**
   - Version: **5.5 or later**
2. **Copy connection string**:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<database>?retryWrites=true&w=majority
   ```
3. **Replace placeholders**:
   - `<username>`: Your database username
   - `<password>`: Your database password  
   - `<database>`: `engunity-ai`

### Step 3: Configure Environment Variables

1. **Copy the environment template**:
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```

2. **Edit `.env.local`** with your MongoDB details:
   ```env
   # MongoDB Atlas Configuration
   MONGODB_URI=mongodb+srv://engunity-admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/engunity-ai?retryWrites=true&w=majority
   MONGODB_DB_NAME=engunity-ai
   ```

3. **Verify other variables** are set for full functionality:
   ```env
   # CS-Enhanced RAG Backend (optional - will use fallbacks if not available)
   RAG_BACKEND_URL=http://localhost:8000
   RAG_API_KEY=your_rag_api_key_here
   ```

### Step 4: Test the Connection

1. **Start your development server**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Test chat functionality**:
   - Go to a document: `http://localhost:3000/dashboard/documents/[id]/qa`
   - Ask a question - it should be saved to MongoDB
   - Check MongoDB Atlas Collections to see the data

3. **Verify collections created**:
   - `chat_messages` - Individual Q&A messages
   - `chat_sessions` - Chat session metadata
   - `document_chats` - Document-to-chat mappings

## 📊 Data Structure

### Collections Created

#### 1. `chat_messages`
Stores individual messages in conversations:
```javascript
{
  _id: ObjectId,
  sessionId: "session_doc123_1640995200000",
  documentId: "doc123",
  userId: "user456", // optional
  role: "user" | "assistant",
  content: "What is binary search?",
  timestamp: ISODate,
  messageId: "msg_user_1640995200000",
  
  // CS-RAG Enhanced fields
  confidence: 0.85,
  sourceType: "hybrid",
  sources: [...],
  processingTime: 1500,
  tokenUsage: { promptTokens: 15, completionTokens: 200, totalTokens: 215 },
  csEnhanced: true,
  ragVersion: "2.0-cs-enhanced"
}
```

#### 2. `chat_sessions`
Groups messages into conversations:
```javascript
{
  _id: ObjectId,
  sessionId: "session_doc123_1640995200000",
  documentId: "doc123",
  userId: "user456", // optional
  title: "Chat about Algorithm Guide",
  createdAt: ISODate,
  updatedAt: ISODate,
  messageCount: 6,
  isActive: true,
  documentInfo: {
    name: "Algorithm Guide.pdf",
    type: "pdf",
    category: "educational"
  },
  totalTokens: 1250,
  avgConfidence: 0.82,
  avgProcessingTime: 1200
}
```

#### 3. `document_chats`
Maps documents to their chat sessions:
```javascript
{
  _id: ObjectId,
  documentId: "doc123",
  userId: "user456", // optional
  sessionIds: ["session_doc123_1640995200000", "session_doc123_1640995300000"],
  totalMessages: 24,
  createdAt: ISODate,
  lastActivity: ISODate,
  documentName: "Algorithm Guide.pdf",
  documentType: "pdf",
  documentStatus: "active",
  stats: {
    totalSessions: 2,
    totalMessages: 24,
    avgSessionLength: 12,
    mostRecentSession: "session_doc123_1640995300000"
  }
}
```

## 🔄 Lifecycle Management

### Chat Persistence Behavior

1. **Document Creation**: No chats initially
2. **First Q&A**: Creates session and document mapping
3. **Subsequent Q&As**: Adds to existing session
4. **Document Deletion**: **Automatically deletes all associated chats**

### API Endpoints

- **POST** `/api/documents/[id]/qa` - Ask question (saves to MongoDB)
- **GET** `/api/documents/[id]/qa` - Get chat history
- **GET** `/api/documents/[id]/qa?sessionId=xyz` - Get specific session
- **DELETE** `/api/documents/[id]/delete-chats` - Manually delete document chats

## 🛡️ Security Considerations

### Production Recommendations

1. **Network Access**: Restrict to specific IP addresses
2. **Database Users**: Create role-specific users
3. **Connection Limits**: Monitor and set appropriate limits
4. **Data Encryption**: Enable encryption at rest (available in paid tiers)

### Environment Security
```env
# Use strong, unique passwords
MONGODB_URI=mongodb+srv://prod-user:VERY-STRONG-PASSWORD@cluster0.xxxxx.mongodb.net/engunity-ai-prod?retryWrites=true&w=majority

# Consider using MongoDB Atlas Data API for serverless environments
# MONGODB_DATA_API_KEY=your_data_api_key
```

## 📈 Monitoring & Performance

### Atlas Monitoring
- **Performance Advisor**: Suggests indexes
- **Real-time Performance Panel**: Query performance
- **Alerts**: Set up for connection issues, high usage

### Application Monitoring
```javascript
// The ChatService includes built-in logging
console.log(`💾 Chat saved: ${userMessageId} & ${assistantMessageId} to session ${sessionId}`);
console.log(`✅ Retrieved ${messages.length} messages from ${sessions.length} sessions`);
```

### Performance Tips
1. **Indexes**: Automatically created on `documentId`, `sessionId`, `timestamp`
2. **Pagination**: Use `limit` and `offset` parameters for large chat histories
3. **Cleanup**: Old chats are automatically removed when documents are deleted

## 🚨 Troubleshooting

### Common Issues

#### Connection Failed
```
Error: Failed to connect to MongoDB Atlas
```
**Solutions**:
- Check network access settings (IP whitelist)
- Verify username/password in connection string
- Ensure cluster is running (not paused)

#### Authentication Failed
```
Error: Authentication failed
```
**Solutions**:
- Verify database user credentials
- Check user permissions (should have read/write access)
- Ensure password special characters are URL-encoded

#### Database/Collection Not Found
- MongoDB will automatically create database and collections on first use
- No manual database creation needed

### Debug Mode
Set debug logging for detailed connection info:
```env
DEBUG=mongodb:*
```

## 🎉 Success Verification

### Chat Working Correctly When:
1. ✅ Questions are saved to `chat_messages` collection
2. ✅ Sessions are created in `chat_sessions` collection  
3. ✅ Document mappings appear in `document_chats` collection
4. ✅ Chat history loads when returning to a document
5. ✅ Chats are deleted when document is removed

### Atlas Dashboard Shows:
- **Active connections** when using the app
- **Operations** (inserts, finds) in real-time
- **Storage growing** as chats accumulate

## 💰 Cost Considerations

### Free Tier (M0)
- **512 MB storage** - Approximately 10,000-50,000 chat messages
- **Shared RAM and CPU** - Fine for development and light usage
- **100 max connections** - Suitable for small teams

### Scaling Up
When you outgrow free tier:
- **M2** ($9/month) - 2GB storage, dedicated CPU
- **M5** ($25/month) - 5GB storage, more memory
- **Consider archiving old chats** to manage storage

---

## 🤝 Need Help?

- **MongoDB Atlas Docs**: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- **MongoDB Node.js Driver**: [mongodb.github.io/node-mongodb-native](https://mongodb.github.io/node-mongodb-native/)
- **Engunity AI Issues**: Create an issue in the project repository

Your Q&A chats are now persistent and will survive server restarts, providing a seamless conversational experience! 🚀