import { MongoClient, Db, Collection, ObjectId } from 'mongodb';

// MongoDB Atlas connection configuration
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI || '';
const DB_NAME = process.env.MONGODB_DB_NAME || 'engunity-ai';

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

// Connection singleton
let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(MONGODB_URI);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(MONGODB_URI);
  clientPromise = client.connect();
}

// Database instance
export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

// Collection getters
export async function getChatCollection(): Promise<Collection<ChatMessage>> {
  const db = await getDatabase();
  return db.collection<ChatMessage>('chat_messages');
}

export async function getChatSessionCollection(): Promise<Collection<ChatSession>> {
  const db = await getDatabase();
  return db.collection<ChatSession>('chat_sessions');
}

export async function getDocumentCollection(): Promise<Collection<DocumentChatMapping>> {
  const db = await getDatabase();
  return db.collection<DocumentChatMapping>('document_chats');
}

// TypeScript interfaces for our data models
export interface ChatMessage {
  _id?: ObjectId;
  sessionId: string;
  documentId: string;
  userId?: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  messageId: string;
  
  // Enhanced fields for CS-RAG
  confidence?: number;
  sourceType?: string;
  sources?: Array<{
    type: string;
    title?: string;
    url?: string;
    confidence: number;
    content: string;
  }>;
  
  // Processing metadata
  processingTime?: number;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  // CS-Enhanced metadata
  csEnhanced?: boolean;
  ragVersion?: string;
  processingMode?: string;
}

export interface ChatSession {
  _id?: ObjectId;
  sessionId: string;
  documentId: string;
  userId?: string;
  title?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  isActive: boolean;
  
  // Session metadata
  documentInfo?: {
    name: string;
    type: string;
    category?: string;
  };
  
  // Performance metrics
  totalTokens?: number;
  avgConfidence?: number;
  avgProcessingTime?: number;
}

export interface DocumentChatMapping {
  _id?: ObjectId;
  documentId: string;
  userId?: string;
  sessionIds: string[];
  totalMessages: number;
  createdAt: Date;
  lastActivity: Date;
  
  // Document metadata
  documentName: string;
  documentType: string;
  documentStatus: string;
  
  // Chat statistics
  stats: {
    totalSessions: number;
    totalMessages: number;
    avgSessionLength: number;
    mostRecentSession?: string;
  };
}

// Chat service class
export class ChatService {
  
  /**
   * Create or get existing chat session for a document
   */
  static async getOrCreateSession(
    documentId: string, 
    userId?: string,
    documentInfo?: { name: string; type: string; category?: string }
  ): Promise<ChatSession> {
    const sessionCollection = await getChatSessionCollection();
    const documentCollection = await getDocumentCollection();
    
    // Try to find existing active session
    let session = await sessionCollection.findOne({
      documentId,
      userId: userId || { $exists: false },
      isActive: true
    });
    
    if (!session) {
      // Create new session
      const sessionId = `session_${documentId}_${Date.now()}`;
      
      const newSession: ChatSession = {
        sessionId,
        documentId,
        userId,
        title: documentInfo?.name ? `Chat about ${documentInfo.name}` : 'Document Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        messageCount: 0,
        isActive: true,
        documentInfo,
        totalTokens: 0,
        avgConfidence: 0,
        avgProcessingTime: 0
      };
      
      const result = await sessionCollection.insertOne(newSession);
      session = { ...newSession, _id: result.insertedId };
      
      // Update document chat mapping
      await this.updateDocumentChatMapping(documentId, sessionId, documentInfo);
    }
    
    return session;
  }
  
  /**
   * Save a chat message
   */
  static async saveMessage(message: Omit<ChatMessage, '_id'>): Promise<ChatMessage> {
    const chatCollection = await getChatCollection();
    const sessionCollection = await getChatSessionCollection();
    
    // Add timestamp if not provided
    const messageToSave: ChatMessage = {
      ...message,
      timestamp: message.timestamp || new Date()
    };
    
    // Insert message
    const result = await chatCollection.insertOne(messageToSave);
    const savedMessage = { ...messageToSave, _id: result.insertedId };
    
    // Update session statistics
    await this.updateSessionStats(message.sessionId, message);
    
    return savedMessage;
  }
  
  /**
   * Get chat history for a session
   */
  static async getChatHistory(
    sessionId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<ChatMessage[]> {
    const chatCollection = await getChatCollection();
    
    const messages = await chatCollection
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    
    return messages;
  }
  
  /**
   * Get all sessions for a document
   */
  static async getDocumentSessions(documentId: string, userId?: string): Promise<ChatSession[]> {
    const sessionCollection = await getChatSessionCollection();
    
    const query: any = { documentId };
    if (userId) {
      query.userId = userId;
    }
    
    const sessions = await sessionCollection
      .find(query)
      .sort({ updatedAt: -1 })
      .toArray();
    
    return sessions;
  }
  
  /**
   * Delete all chats for a document (when document is deleted)
   */
  static async deleteDocumentChats(documentId: string): Promise<{ 
    deletedMessages: number; 
    deletedSessions: number; 
  }> {
    const chatCollection = await getChatCollection();
    const sessionCollection = await getChatSessionCollection();
    const documentCollection = await getDocumentCollection();
    
    // Delete all messages for this document
    const messageResult = await chatCollection.deleteMany({ documentId });
    
    // Delete all sessions for this document
    const sessionResult = await sessionCollection.deleteMany({ documentId });
    
    // Delete document chat mapping
    await documentCollection.deleteOne({ documentId });
    
    return {
      deletedMessages: messageResult.deletedCount || 0,
      deletedSessions: sessionResult.deletedCount || 0
    };
  }
  
  /**
   * Get chat statistics for a document
   */
  static async getDocumentChatStats(documentId: string): Promise<{
    totalSessions: number;
    totalMessages: number;
    lastActivity?: Date;
    mostActiveSession?: string;
  }> {
    const sessionCollection = await getChatSessionCollection();
    const chatCollection = await getChatCollection();
    
    // Get session count
    const totalSessions = await sessionCollection.countDocuments({ documentId });
    
    // Get message count
    const totalMessages = await chatCollection.countDocuments({ documentId });
    
    // Get last activity
    const lastMessage = await chatCollection
      .findOne({ documentId }, { sort: { timestamp: -1 } });
    
    // Get most active session
    const sessionStats = await chatCollection.aggregate([
      { $match: { documentId } },
      { $group: { _id: '$sessionId', messageCount: { $sum: 1 } } },
      { $sort: { messageCount: -1 } },
      { $limit: 1 }
    ]).toArray();
    
    return {
      totalSessions,
      totalMessages,
      lastActivity: lastMessage?.timestamp,
      mostActiveSession: sessionStats[0]?._id
    };
  }
  
  /**
   * Update session statistics
   */
  private static async updateSessionStats(sessionId: string, message: ChatMessage): Promise<void> {
    const sessionCollection = await getChatSessionCollection();
    const chatCollection = await getChatCollection();
    
    // Calculate new statistics
    const messageCount = await chatCollection.countDocuments({ sessionId });
    
    const stats = await chatCollection.aggregate([
      { $match: { sessionId } },
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: '$confidence' },
          avgProcessingTime: { $avg: '$processingTime' },
          totalTokens: { $sum: '$tokenUsage.totalTokens' }
        }
      }
    ]).toArray();
    
    const sessionStats = stats[0] || {};
    
    // Update session
    await sessionCollection.updateOne(
      { sessionId },
      {
        $set: {
          messageCount,
          updatedAt: new Date(),
          avgConfidence: sessionStats.avgConfidence || 0,
          avgProcessingTime: sessionStats.avgProcessingTime || 0,
          totalTokens: sessionStats.totalTokens || 0
        }
      }
    );
  }
  
  /**
   * Update document chat mapping
   */
  private static async updateDocumentChatMapping(
    documentId: string, 
    sessionId: string,
    documentInfo?: { name: string; type: string; category?: string }
  ): Promise<void> {
    const documentCollection = await getDocumentCollection();
    
    const existing = await documentCollection.findOne({ documentId });
    
    if (existing) {
      // Update existing mapping
      await documentCollection.updateOne(
        { documentId },
        {
          $addToSet: { sessionIds: sessionId },
          $inc: { 'stats.totalSessions': 1 },
          $set: { 
            lastActivity: new Date(),
            'stats.mostRecentSession': sessionId
          }
        }
      );
    } else {
      // Create new mapping
      const newMapping: DocumentChatMapping = {
        documentId,
        sessionIds: [sessionId],
        totalMessages: 0,
        createdAt: new Date(),
        lastActivity: new Date(),
        documentName: documentInfo?.name || 'Unknown Document',
        documentType: documentInfo?.type || 'Unknown',
        documentStatus: 'active',
        stats: {
          totalSessions: 1,
          totalMessages: 0,
          avgSessionLength: 0,
          mostRecentSession: sessionId
        }
      };
      
      await documentCollection.insertOne(newMapping);
    }
  }
}

// Utility functions for connection management
export async function connectToMongoDB(): Promise<void> {
  try {
    await clientPromise;
    console.log(' Connected to MongoDB Atlas');
  } catch (error) {
    console.error('L Failed to connect to MongoDB Atlas:', error);
    throw error;
  }
}

export async function closeMongoDB(): Promise<void> {
  if (client) {
    await client.close();
    console.log('= Disconnected from MongoDB Atlas');
  }
}

// Health check function
export async function checkMongoDBHealth(): Promise<{
  connected: boolean;
  database: string;
  collections: string[];
}> {
  try {
    const db = await getDatabase();
    const collections = await db.listCollections().toArray();
    
    return {
      connected: true,
      database: DB_NAME,
      collections: collections.map(c => c.name)
    };
  } catch (error) {
    return {
      connected: false,
      database: DB_NAME,
      collections: []
    };
  }
}

// Export the client promise for advanced usage
export default clientPromise;