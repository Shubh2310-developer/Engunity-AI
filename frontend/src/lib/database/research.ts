import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { getDatabase } from './mongodb';

// Research Data Interfaces
export interface ResearchDocument {
  _id?: ObjectId;
  userId: string;
  documentId: string;
  name: string;
  type: string;
  size: number;
  uploadDate: Date;
  status: 'uploaded' | 'processing' | 'processed' | 'failed';
  
  // File metadata
  originalName: string;
  mimeType: string;
  filePath?: string;
  
  // Processing results
  extractedText?: string;
  summary?: string;
  citations?: Citation[];
  topics?: string[];
  keywords?: string[];
  
  // Analysis metadata
  processingTime?: number;
  confidence?: number;
  language?: string;
  pageCount?: number;
  wordCount?: number;
  
  // Research categorization
  category?: string;
  domain?: string;
  authors?: string[];
  publicationDate?: Date;
  journal?: string;
  doi?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface Citation {
  _id?: ObjectId;
  userId: string;
  documentId: string;
  citationId: string;
  
  // Citation details
  type: 'book' | 'journal' | 'conference' | 'web' | 'thesis' | 'other';
  title: string;
  authors: string[];
  year?: number;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  isbn?: string;
  
  // Formatted citations
  apa?: string;
  mla?: string;
  ieee?: string;
  harvard?: string;
  chicago?: string;
  
  // Extraction metadata
  extractedFrom: string; // Page or section where found
  confidence: number;
  context?: string; // Surrounding text
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ResearchActivity {
  _id?: ObjectId;
  userId: string;
  activityId: string;
  
  // Activity details
  type: 'upload' | 'process' | 'summarize' | 'extract_citations' | 'analyze' | 'query' | 'export';
  action: string;
  target: string; // Document name or ID
  targetType: 'document' | 'citation' | 'summary' | 'query';
  
  // Activity status
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress?: number; // 0-100
  
  // Results
  result?: any;
  error?: string;
  
  // Metadata
  processingTime?: number;
  timestamp: Date;
  
  // User context
  sessionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface ResearchStats {
  _id?: ObjectId;
  userId: string;
  
  // Document statistics
  uploadedPapers: number;
  processedDocuments: number;
  totalStorageUsed: number; // in bytes
  
  // Citation statistics
  extractedCitations: number;
  citationsByType: Record<string, number>;
  
  // Analysis statistics
  summarizedDocuments: number;
  literatureTopics: number;
  totalQueries: number;
  
  // Performance metrics
  avgProcessingTime: number;
  avgConfidence: number;
  
  // Usage tracking
  lastActivity: Date;
  totalSessions: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface LiteratureTopic {
  _id?: ObjectId;
  userId: string;
  topicId: string;
  
  // Topic details
  name: string;
  description?: string;
  keywords: string[];
  
  // Related documents
  documentIds: string[];
  documentCount: number;
  
  // Analysis results
  summary?: string;
  themes?: string[];
  connections?: Array<{
    topicId: string;
    strength: number;
    documents: string[];
  }>;
  
  // Metadata
  confidence: number;
  lastAnalyzed: Date;
  
  createdAt: Date;
  updatedAt: Date;
}

// Collection getters
export async function getResearchDocumentCollection(): Promise<Collection<ResearchDocument>> {
  const db = await getDatabase();
  return db.collection<ResearchDocument>('research_documents');
}

export async function getCitationCollection(): Promise<Collection<Citation>> {
  const db = await getDatabase();
  return db.collection<Citation>('research_citations');
}

export async function getResearchActivityCollection(): Promise<Collection<ResearchActivity>> {
  const db = await getDatabase();
  return db.collection<ResearchActivity>('research_activities');
}

export async function getResearchStatsCollection(): Promise<Collection<ResearchStats>> {
  const db = await getDatabase();
  return db.collection<ResearchStats>('research_stats');
}

export async function getLiteratureTopicCollection(): Promise<Collection<LiteratureTopic>> {
  const db = await getDatabase();
  return db.collection<LiteratureTopic>('literature_topics');
}

// Research Service Class
export class ResearchService {
  
  /**
   * Create a new research document record
   */
  static async createDocument(
    userId: string,
    file: {
      name: string;
      type: string;
      size: number;
      originalName: string;
      mimeType: string;
    }
  ): Promise<ResearchDocument> {
    const collection = await getResearchDocumentCollection();
    
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const document: ResearchDocument = {
      userId,
      documentId,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadDate: new Date(),
      status: 'uploaded',
      originalName: file.originalName,
      mimeType: file.mimeType,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(document);
    const savedDocument = { ...document, _id: result.insertedId };
    
    // Log activity
    await this.logActivity(userId, {
      type: 'upload',
      action: 'Uploaded',
      target: file.name,
      targetType: 'document',
      status: 'completed'
    });
    
    // Update stats
    await this.updateUserStats(userId);
    
    return savedDocument;
  }
  
  /**
   * Update document processing status and results
   */
  static async updateDocumentProcessing(
    documentId: string,
    updates: Partial<ResearchDocument>
  ): Promise<void> {
    const collection = await getResearchDocumentCollection();
    
    await collection.updateOne(
      { documentId },
      {
        $set: {
          ...updates,
          updatedAt: new Date()
        }
      }
    );
    
    // If processing completed, log activity
    if (updates.status === 'processed') {
      const document = await collection.findOne({ documentId });
      if (document) {
        await this.logActivity(document.userId, {
          type: 'process',
          action: 'Processed',
          target: document.name,
          targetType: 'document',
          status: 'completed',
          processingTime: updates.processingTime
        });
        
        await this.updateUserStats(document.userId);
      }
    }
  }
  
  /**
   * Get user's research documents
   */
  static async getUserDocuments(
    userId: string,
    limit: number = 20,
    offset: number = 0,
    status?: string
  ): Promise<ResearchDocument[]> {
    const collection = await getResearchDocumentCollection();
    
    const query: any = { userId };
    if (status) {
      query.status = status;
    }
    
    const documents = await collection
      .find(query)
      .sort({ uploadDate: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    
    return documents;
  }
  
  /**
   * Save extracted citations
   */
  static async saveCitations(
    userId: string,
    documentId: string,
    citations: Omit<Citation, '_id' | 'userId' | 'documentId' | 'citationId' | 'createdAt' | 'updatedAt'>[]
  ): Promise<Citation[]> {
    const collection = await getCitationCollection();
    
    const citationsToSave: Citation[] = citations.map(citation => ({
      ...citation,
      userId,
      documentId,
      citationId: `cite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    }));
    
    const result = await collection.insertMany(citationsToSave);
    const savedCitations = citationsToSave.map((citation, index) => ({
      ...citation,
      _id: result.insertedIds[index]
    }));
    
    // Log activity
    const document = await (await getResearchDocumentCollection()).findOne({ documentId });
    if (document) {
      await this.logActivity(userId, {
        type: 'extract_citations',
        action: 'Extracted Citations',
        target: document.name,
        targetType: 'document',
        status: 'completed'
      });
    }
    
    await this.updateUserStats(userId);
    
    return savedCitations;
  }
  
  /**
   * Get user's citations
   */
  static async getUserCitations(
    userId: string,
    documentId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Citation[]> {
    const collection = await getCitationCollection();
    
    const query: any = { userId };
    if (documentId) {
      query.documentId = documentId;
    }
    
    const citations = await collection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    
    return citations;
  }
  
  /**
   * Log user activity
   */
  static async logActivity(
    userId: string,
    activity: Omit<ResearchActivity, '_id' | 'userId' | 'activityId' | 'timestamp'>
  ): Promise<ResearchActivity> {
    const collection = await getResearchActivityCollection();
    
    const activityToSave: ResearchActivity = {
      ...activity,
      userId,
      activityId: `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
    
    const result = await collection.insertOne(activityToSave);
    return { ...activityToSave, _id: result.insertedId };
  }
  
  /**
   * Get user's recent activities
   */
  static async getUserActivities(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ResearchActivity[]> {
    const collection = await getResearchActivityCollection();
    
    const activities = await collection
      .find({ userId })
      .sort({ timestamp: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();
    
    return activities;
  }
  
  /**
   * Get or create user stats
   */
  static async getUserStats(userId: string): Promise<ResearchStats> {
    const collection = await getResearchStatsCollection();
    
    let stats = await collection.findOne({ userId });
    
    if (!stats) {
      const newStats: ResearchStats = {
        userId,
        uploadedPapers: 0,
        processedDocuments: 0,
        totalStorageUsed: 0,
        extractedCitations: 0,
        citationsByType: {},
        summarizedDocuments: 0,
        literatureTopics: 0,
        totalQueries: 0,
        avgProcessingTime: 0,
        avgConfidence: 0,
        lastActivity: new Date(),
        totalSessions: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await collection.insertOne(newStats);
      stats = { ...newStats, _id: result.insertedId };
    }
    
    return stats;
  }
  
  /**
   * Update user statistics
   */
  static async updateUserStats(userId: string): Promise<void> {
    const statsCollection = await getResearchStatsCollection();
    const docsCollection = await getResearchDocumentCollection();
    const citationsCollection = await getCitationCollection();
    
    // Calculate new statistics
    const totalDocs = await docsCollection.countDocuments({ userId });
    const processedDocs = await docsCollection.countDocuments({ userId, status: 'processed' });
    const totalCitations = await citationsCollection.countDocuments({ userId });
    
    // Calculate storage used
    const storageAgg = await docsCollection.aggregate([
      { $match: { userId } },
      { $group: { _id: null, totalSize: { $sum: '$size' } } }
    ]).toArray();
    const totalStorage = storageAgg[0]?.totalSize || 0;
    
    // Calculate citations by type
    const citationTypeAgg = await citationsCollection.aggregate([
      { $match: { userId } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]).toArray();
    const citationsByType = citationTypeAgg.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {} as Record<string, number>);
    
    // Update stats
    await statsCollection.updateOne(
      { userId },
      {
        $set: {
          uploadedPapers: totalDocs,
          processedDocuments: processedDocs,
          totalStorageUsed: totalStorage,
          extractedCitations: totalCitations,
          citationsByType,
          lastActivity: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );
  }
  
  /**
   * Search documents
   */
  static async searchDocuments(
    userId: string,
    query: string,
    filters?: {
      type?: string;
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<ResearchDocument[]> {
    const collection = await getResearchDocumentCollection();
    
    const searchQuery: any = {
      userId,
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { originalName: { $regex: query, $options: 'i' } },
        { extractedText: { $regex: query, $options: 'i' } },
        { summary: { $regex: query, $options: 'i' } },
        { keywords: { $in: [new RegExp(query, 'i')] } }
      ]
    };
    
    if (filters) {
      if (filters.type) searchQuery.type = filters.type;
      if (filters.status) searchQuery.status = filters.status;
      if (filters.dateFrom || filters.dateTo) {
        searchQuery.uploadDate = {};
        if (filters.dateFrom) searchQuery.uploadDate.$gte = filters.dateFrom;
        if (filters.dateTo) searchQuery.uploadDate.$lte = filters.dateTo;
      }
    }
    
    const documents = await collection
      .find(searchQuery)
      .sort({ uploadDate: -1 })
      .limit(50)
      .toArray();
    
    return documents;
  }
  
  /**
   * Delete document and related data
   */
  static async deleteDocument(userId: string, documentId: string): Promise<void> {
    const docsCollection = await getResearchDocumentCollection();
    const citationsCollection = await getCitationCollection();
    const activitiesCollection = await getResearchActivityCollection();
    
    // Verify ownership
    const document = await docsCollection.findOne({ userId, documentId });
    if (!document) {
      throw new Error('Document not found or access denied');
    }
    
    // Delete related data
    await citationsCollection.deleteMany({ userId, documentId });
    await activitiesCollection.deleteMany({ userId, target: document.name });
    
    // Delete document
    await docsCollection.deleteOne({ userId, documentId });
    
    // Update stats
    await this.updateUserStats(userId);
  }
}