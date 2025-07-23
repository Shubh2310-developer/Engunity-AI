/**
 * Firestore Service Layer for Engunity AI
 * Handles all Firestore database operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  Timestamp,
  DocumentReference,
  QuerySnapshot,
  DocumentData
} from 'firebase/firestore';
import { firestore } from './config';

// ================================
// TYPE DEFINITIONS
// ================================

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: string;
  plan: 'Free' | 'Pro' | 'Enterprise';
  initials: string;
  timezone: string;
  lastActive: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    notifications: boolean;
    language: string;
  };
  usage: {
    documentsProcessed: number;
    codeGenerations: number;
    aiQueries: number;
    chatSessions: number;
    insights: number;
  };
  subscription?: {
    status: 'active' | 'inactive' | 'trial';
    plan: string;
    nextBilling?: Timestamp;
    features: string[];
  };
}

export interface Document {
  id: string;
  userId: string;
  name: string;
  type: 'PDF' | 'DOCX' | 'XLSX' | 'TXT' | 'MD';
  size: string;
  category: string;
  status: 'uploading' | 'processing' | 'processed' | 'failed';
  uploadedAt: Timestamp;
  processedAt?: Timestamp;
  metadata: {
    pages?: number;
    wordCount?: number;
    language?: string;
    extractedText?: string;
  };
  storageUrl: string;
  thumbnailUrl?: string;
  tags: string[];
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  model: string;
  tokens: number;
  isArchived: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Timestamp;
  tokens?: number;
  metadata?: {
    model?: string;
    temperature?: number;
    context?: string[];
  };
}

export interface Activity {
  id: string;
  userId: string;
  action: string;
  item: string;
  type: 'upload' | 'analysis' | 'code' | 'question' | 'chat';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timestamp: Timestamp;
  metadata?: DocumentData;
}

// ================================
// COLLECTION REFERENCES
// ================================

const COLLECTIONS = {
  users: 'users',
  documents: 'documents',
  chatSessions: 'chatSessions',
  activities: 'activities',
  analytics: 'analytics'
} as const;

// ================================
// USER PROFILE OPERATIONS
// ================================

export class UserService {
  static async createUserProfile(userId: string, userData: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(firestore, COLLECTIONS.users, userId);
      const now = Timestamp.now();
      
      const defaultProfile: Partial<UserProfile> = {
        id: userId,
        createdAt: now,
        updatedAt: now,
        lastActive: now,
        preferences: {
          theme: 'system',
          notifications: true,
          language: 'en'
        },
        usage: {
          documentsProcessed: 0,
          codeGenerations: 0,
          aiQueries: 0,
          chatSessions: 0,
          insights: 0
        },
        plan: 'Free',
        role: 'User',
        ...userData
      };

      await setDoc(userRef, defaultProfile);
      console.log('✅ User profile created:', userId);
    } catch (error) {
      console.error('❌ Error creating user profile:', error);
      throw error;
    }
  }

  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const userRef = doc(firestore, COLLECTIONS.users, userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return userSnap.data() as UserProfile;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      throw error;
    }
  }

  static async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const userRef = doc(firestore, COLLECTIONS.users, userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: Timestamp.now()
      });
      console.log('✅ User profile updated:', userId);
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  }

  static async updateUserActivity(userId: string): Promise<void> {
    try {
      const userRef = doc(firestore, COLLECTIONS.users, userId);
      await updateDoc(userRef, {
        lastActive: Timestamp.now()
      });
    } catch (error) {
      console.error('❌ Error updating user activity:', error);
      // Don't throw for activity updates - it's non-critical
    }
  }

  static async incrementUsageStats(userId: string, stat: keyof UserProfile['usage']): Promise<void> {
    try {
      const userRef = doc(firestore, COLLECTIONS.users, userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const currentUsage = userDoc.data().usage || {};
        await updateDoc(userRef, {
          [`usage.${stat}`]: (currentUsage[stat] || 0) + 1,
          updatedAt: Timestamp.now()
        });
      }
    } catch (error) {
      console.error('❌ Error incrementing usage stats:', error);
      // Don't throw for stats updates - it's non-critical
    }
  }
}

// ================================
// DOCUMENT OPERATIONS
// ================================

export class DocumentService {
  static async createDocument(document: Omit<Document, 'id'>): Promise<string> {
    try {
      const docRef = doc(collection(firestore, COLLECTIONS.documents));
      const documentData: Document = {
        ...document,
        id: docRef.id,
        uploadedAt: Timestamp.now()
      };

      await setDoc(docRef, documentData);
      console.log('✅ Document created:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating document:', error);
      throw error;
    }
  }

  static async getUserDocuments(userId: string, limitCount = 10): Promise<Document[]> {
    try {
      const q = query(
        collection(firestore, COLLECTIONS.documents),
        where('userId', '==', userId),
        orderBy('uploadedAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Document);
    } catch (error) {
      console.error('❌ Error fetching user documents:', error);
      throw error;
    }
  }

  static async updateDocumentStatus(documentId: string, status: Document['status'], metadata?: Partial<Document['metadata']>): Promise<void> {
    try {
      const docRef = doc(firestore, COLLECTIONS.documents, documentId);
      const updates: Partial<Document> = { status };
      
      if (status === 'processed') {
        updates.processedAt = Timestamp.now();
      }
      
      if (metadata) {
        updates.metadata = metadata;
      }

      await updateDoc(docRef, updates);
      console.log('✅ Document status updated:', documentId, status);
    } catch (error) {
      console.error('❌ Error updating document status:', error);
      throw error;
    }
  }

  static async getDocument(documentId: string): Promise<Document> {
    try {
      const docRef = doc(firestore, COLLECTIONS.documents, documentId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as Document;
      } else {
        throw new Error('Document not found');
      }
    } catch (error) {
      console.error('❌ Error fetching document:', error);
      throw error;
    }
  }

  static async deleteDocument(documentId: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, COLLECTIONS.documents, documentId));
      console.log('✅ Document deleted:', documentId);
    } catch (error) {
      console.error('❌ Error deleting document:', error);
      throw error;
    }
  }
}

// ================================
// CHAT OPERATIONS
// ================================

export class ChatService {
  static async createChatSession(userId: string, title: string): Promise<string> {
    try {
      const chatRef = doc(collection(firestore, COLLECTIONS.chatSessions));
      const chatSession: ChatSession = {
        id: chatRef.id,
        userId,
        title,
        messages: [],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        model: 'gpt-4',
        tokens: 0,
        isArchived: false
      };

      await setDoc(chatRef, chatSession);
      console.log('✅ Chat session created:', chatRef.id);
      return chatRef.id;
    } catch (error) {
      console.error('❌ Error creating chat session:', error);
      throw error;
    }
  }

  static async addMessageToChat(chatId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<void> {
    try {
      const chatRef = doc(firestore, COLLECTIONS.chatSessions, chatId);
      const chatDoc = await getDoc(chatRef);
      
      if (chatDoc.exists()) {
        const chatData = chatDoc.data() as ChatSession;
        const newMessage: ChatMessage = {
          ...message,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Timestamp.now()
        };

        const updatedMessages = [...chatData.messages, newMessage];
        
        await updateDoc(chatRef, {
          messages: updatedMessages,
          updatedAt: Timestamp.now(),
          tokens: chatData.tokens + (message.tokens || 0)
        });

        console.log('✅ Message added to chat:', chatId);
      }
    } catch (error) {
      console.error('❌ Error adding message to chat:', error);
      throw error;
    }
  }

  static async getUserChats(userId: string, limitCount = 20): Promise<ChatSession[]> {
    try {
      const q = query(
        collection(firestore, COLLECTIONS.chatSessions),
        where('userId', '==', userId),
        where('isArchived', '==', false),
        orderBy('updatedAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as ChatSession);
    } catch (error) {
      console.error('❌ Error fetching user chats:', error);
      throw error;
    }
  }

  static async archiveChat(chatId: string): Promise<void> {
    try {
      const chatRef = doc(firestore, COLLECTIONS.chatSessions, chatId);
      await updateDoc(chatRef, {
        isArchived: true,
        updatedAt: Timestamp.now()
      });
      console.log('✅ Chat archived:', chatId);
    } catch (error) {
      console.error('❌ Error archiving chat:', error);
      throw error;
    }
  }
}

// ================================
// ACTIVITY TRACKING
// ================================

export class ActivityService {
  static async logActivity(userId: string, activity: Omit<Activity, 'id' | 'userId' | 'timestamp'>): Promise<void> {
    try {
      const activityRef = doc(collection(firestore, COLLECTIONS.activities));
      const activityData: Activity = {
        ...activity,
        id: activityRef.id,
        userId,
        timestamp: Timestamp.now()
      };

      await setDoc(activityRef, activityData);
      console.log('✅ Activity logged:', activity.action);
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      // Don't throw for activity logging - it's non-critical
    }
  }

  static async getUserActivities(userId: string, limitCount = 10): Promise<Activity[]> {
    try {
      const q = query(
        collection(firestore, COLLECTIONS.activities),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Activity);
    } catch (error) {
      console.error('❌ Error fetching user activities:', error);
      throw error;
    }
  }
}

// ================================
// BATCH OPERATIONS
// ================================

export class BatchService {
  static async batchUpdate(operations: Array<{ ref: DocumentReference; data: DocumentData }>): Promise<void> {
    try {
      const batch = writeBatch(firestore);
      
      operations.forEach(({ ref, data }) => {
        batch.update(ref, data);
      });

      await batch.commit();
      console.log('✅ Batch update completed');
    } catch (error) {
      console.error('❌ Error in batch update:', error);
      throw error;
    }
  }

  static async batchCreate(operations: Array<{ ref: DocumentReference; data: DocumentData }>): Promise<void> {
    try {
      const batch = writeBatch(firestore);
      
      operations.forEach(({ ref, data }) => {
        batch.set(ref, data);
      });

      await batch.commit();
      console.log('✅ Batch create completed');
    } catch (error) {
      console.error('❌ Error in batch create:', error);
      throw error;
    }
  }
}

// Default export for easy importing
export default {
  User: UserService,
  Documents: DocumentService,
  Chat: ChatService,
  Activity: ActivityService,
  Batch: BatchService
};