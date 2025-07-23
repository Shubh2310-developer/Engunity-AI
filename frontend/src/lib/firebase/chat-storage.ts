/**
 * Chat Storage Integration Service
 * Connects Firebase Storage with Firestore for comprehensive chat data management
 */

import { 
  uploadChatAttachment, 
  exportChatSession, 
  deleteFile, 
  getFileURL,
  saveUserData,
  loadUserData 
} from './storage';
import { ChatService, ChatSession, ChatMessage } from './firestore';

// ================================
// TYPE DEFINITIONS
// ================================

export interface ChatAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  storagePath: string;
  uploadedAt: Date;
}

export interface ChatExportOptions {
  format: 'json' | 'txt' | 'md';
  includeAttachments?: boolean;
  includeMetadata?: boolean;
}

export interface ChatBackup {
  sessions: ChatSession[];
  exportedAt: Date;
  userId: string;
  version: string;
}

// ================================
// CHAT ATTACHMENT MANAGEMENT
// ================================

/**
 * Add attachment to a chat message
 */
export async function addChatAttachment(
  userId: string,
  chatId: string,
  messageId: string,
  file: File
): Promise<{ success: boolean; attachment?: ChatAttachment; error?: string }> {
  try {
    // Upload file to Firebase Storage
    const uploadResult = await uploadChatAttachment(userId, chatId, file);
    
    if (!uploadResult.success) {
      return {
        success: false, 
        error: uploadResult.error
      };
    }

    // Create attachment object
    const attachment: ChatAttachment = {
      id: `attach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      url: uploadResult.url!,
      type: file.type,
      size: file.size,
      storagePath: uploadResult.path!,
      uploadedAt: new Date()
    };

    // Get current chat session
    const chatRef = await import('firebase/firestore').then(
      ({ doc, getDoc }) => doc(import('./config').then(({ firestore }) => firestore), 'chatSessions', chatId)
    );
    const { getDoc } = await import('firebase/firestore');
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      return {
        success: false, 
        error: 'Chat session not found'
      };
    }

    const chatData = chatDoc.data() as ChatSession;
    
    // Find and update the message with attachment
    const updatedMessages = chatData.messages.map(msg => {
      if (msg.id === messageId) {
        return {
          ...msg,
          metadata: {
            ...msg.metadata,
            attachments: [...(msg.metadata?.attachments || []), attachment]
          }
        };
      }
      return msg;
    });

    // Update chat session with new message data
    const { updateDoc } = await import('firebase/firestore');
    await updateDoc(chatRef, {
      messages: updatedMessages,
      updatedAt: new Date()
    });

    return {
      success: true,
      attachment
    };

  } catch (error: any) {
    return {
      success: false,
      error: `Failed to add attachment: ${error.message || error}`
    };
  }
}

/**
 * Remove attachment from chat message
 */
export async function removeChatAttachment(
  chatId: string,
  messageId: string,
  attachmentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current chat session
    const { doc, getDoc, updateDoc } = await import('firebase/firestore');
    const { firestore } = await import('./config');
    const chatRef = doc(firestore, 'chatSessions', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      return {
        success: false, 
        error: 'Chat session not found'
      };
    }

    const chatData = chatDoc.data() as ChatSession;
    
    // Find the attachment to get its storage path
    let attachmentToDelete: ChatAttachment | null = null;
    const updatedMessages = chatData.messages.map(msg => {
      if (msg.id === messageId && msg.metadata?.attachments) {
        const updatedAttachments = msg.metadata.attachments.filter((att: ChatAttachment) => {
          if (att.id === attachmentId) {
            attachmentToDelete = att;
            return false;
          }
          return true;
        });
        
        return {
          ...msg,
          metadata: {
            ...msg.metadata,
            attachments: updatedAttachments
          }
        };
      }
      return msg;
    });

    // Delete file from Firebase Storage
    if (attachmentToDelete) {
      await deleteFile(attachmentToDelete.storagePath);
    }

    // Update chat session
    await updateDoc(chatRef, {
      messages: updatedMessages,
      updatedAt: new Date()
    });

    return { success: true };

  } catch (error: any) {
    return {
      success: false,
      error: `Failed to remove attachment: ${error.message || error}`
    };
  }
}

// ================================
// CHAT EXPORT FUNCTIONS
// ================================

/**
 * Export single chat session
 */
export async function exportChat(
  userId: string,
  chatId: string,
  options: ChatExportOptions = { format: 'json' }
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Get chat session from Firestore
    const { doc, getDoc } = await import('firebase/firestore');
    const { firestore } = await import('./config');
    const chatRef = doc(firestore, 'chatSessions', chatId);
    const chatDoc = await getDoc(chatRef);
    
    if (!chatDoc.exists()) {
      return {
        success: false, 
        error: 'Chat session not found'
      };
    }

    const chatData = chatDoc.data() as ChatSession;
    
    // Prepare export data
    let exportData: any = {
      id: chatData.id,
      title: chatData.title,
      createdAt: chatData.createdAt,
      updatedAt: chatData.updatedAt,
      model: chatData.model,
      messages: chatData.messages
    };

    if (options.includeMetadata) {
      exportData.metadata = {
        tokens: chatData.tokens,
        messageCount: chatData.messages.length,
        exportedAt: new Date().toISOString(),
        exportFormat: options.format
      };
    }

    // Include attachment URLs if requested
    if (options.includeAttachments) {
      exportData.messages = await Promise.all(
        chatData.messages.map(async (msg) => {
          if (msg.metadata?.attachments) {
            const attachmentsWithUrls = await Promise.all(
              msg.metadata.attachments.map(async (att: ChatAttachment) => {
                const { success, url } = await getFileURL(att.storagePath);
                return success ? { ...att, downloadUrl: url } : att;
              })
            );
            return {
              ...msg,
              metadata: {
                ...msg.metadata,
                attachments: attachmentsWithUrls
              }
            };
          }
          return msg;
        })
      );
    }

    // Export to Firebase Storage
    const exportResult = await exportChatSession(userId, chatId, exportData, options.format);
    
    if (!exportResult.success) {
      return {
        success: false,
        error: exportResult.error
      };
    }

    return {
      success: true,
      url: exportResult.url
    };

  } catch (error: any) {
    return {
      success: false,
      error: `Export failed: ${error.message || error}`
    };
  }
}

/**
 * Export all user chats
 */
export async function exportAllChats(
  userId: string,
  options: ChatExportOptions = { format: 'json' }
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Get all user chats
    const userChats = await ChatService.getUserChats(userId, 100); // Get up to 100 chats
    
    if (userChats.length === 0) {
      return {
        success: false,
        error: 'No chats found to export'
      };
    }

    // Prepare backup data
    const backupData: ChatBackup = {
      sessions: userChats,
      exportedAt: new Date(),
      userId,
      version: '1.0'
    };

    // Save to Firebase Storage
    const saveResult = await saveUserData(userId, 'chat-backup', backupData);
    
    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error
      };
    }

    return {
      success: true,
      url: saveResult.url
    };

  } catch (error: any) {
    return {
      success: false,
      error: `Backup failed: ${error.message || error}`
    };
  }
}

// ================================
// CHAT BACKUP & RESTORE
// ================================

/**
 * Create automatic chat backup
 */
export async function createChatBackup(userId: string): Promise<{ success: boolean; backupPath?: string; error?: string }> {
  try {
    const userChats = await ChatService.getUserChats(userId, 1000); // Get all chats
    
    const backupData: ChatBackup = {
      sessions: userChats,
      exportedAt: new Date(),
      userId,
      version: '1.0'
    };

    const saveResult = await saveUserData(userId, `chat-backup-${Date.now()}`, backupData);
    
    if (!saveResult.success) {
      return {
        success: false,
        error: saveResult.error
      };
    }

    return {
      success: true,
      backupPath: saveResult.path
    };

  } catch (error: any) {
    return {
      success: false,
      error: `Backup creation failed: ${error.message || error}`
    };
  }
}

/**
 * Restore chats from backup
 */
export async function restoreChatBackup(
  userId: string, 
  backupPath: string
): Promise<{ success: boolean; restoredCount?: number; error?: string }> {
  try {
    // Load backup data
    const { success, data, error } = await loadUserData(backupPath);
    
    if (!success || !data) {
      return {
        success: false,
        error: error || 'Failed to load backup data'
      };
    }

    const backupData = data as ChatBackup;
    
    // Verify backup belongs to user
    if (backupData.userId !== userId) {
      return {
        success: false,
        error: 'Backup does not belong to current user'
      };
    }

    // Restore chat sessions
    let restoredCount = 0;
    for (const session of backupData.sessions) {
      try {
        // Create new chat session ID to avoid conflicts
        const newChatId = await ChatService.createChatSession(userId, session.title);
        
        // Restore messages one by one
        for (const message of session.messages) {
          await ChatService.addMessageToChat(newChatId, {
            role: message.role,
            content: message.content,
            tokens: message.tokens,
            metadata: message.metadata
          });
        }
        
        restoredCount++;
      } catch (sessionError) {
        console.error('Failed to restore session:', session.id, sessionError);
      }
    }

    return {
      success: true,
      restoredCount
    };

  } catch (error: any) {
    return {
      success: false,
      error: `Restore failed: ${error.message || error}`
    };
  }
}

// ================================
// CHAT ANALYTICS & INSIGHTS
// ================================

/**
 * Generate chat usage analytics
 */
export async function generateChatAnalytics(userId: string): Promise<{
  success: boolean;
  analytics?: any;
  error?: string;
}> {
  try {
    const userChats = await ChatService.getUserChats(userId, 1000);
    
    const analytics = {
      totalChats: userChats.length,
      totalMessages: userChats.reduce((sum, chat) => sum + chat.messages.length, 0),
      totalTokens: userChats.reduce((sum, chat) => sum + chat.tokens, 0),
      averageMessagesPerChat: userChats.length > 0 
        ? userChats.reduce((sum, chat) => sum + chat.messages.length, 0) / userChats.length 
        : 0,
      mostActiveDay: getMostActiveDay(userChats),
      topModels: getTopModels(userChats),
      chatsByMonth: getChatsByMonth(userChats),
      generatedAt: new Date().toISOString()
    };

    // Save analytics to storage
    const saveResult = await saveUserData(userId, 'chat-analytics', analytics);
    
    return {
      success: saveResult.success,
      analytics,
      error: saveResult.error
    };

  } catch (error: any) {
    return {
      success: false,
      error: `Analytics generation failed: ${error.message || error}`
    };
  }
}

// Helper functions for analytics
function getMostActiveDay(chats: ChatSession[]): string {
  const dayCounts: Record<string, number> = {};
  
  chats.forEach(chat => {
    const day = new Date(chat.createdAt.seconds * 1000).toLocaleDateString('en-US', { weekday: 'long' });
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  });

  return Object.entries(dayCounts).reduce((a, b) => dayCounts[a[0]] > dayCounts[b[0]] ? a : b, ['', 0])[0] || 'No data';
}

function getTopModels(chats: ChatSession[]): Array<{ model: string; count: number }> {
  const modelCounts: Record<string, number> = {};
  
  chats.forEach(chat => {
    modelCounts[chat.model] = (modelCounts[chat.model] || 0) + 1;
  });

  return Object.entries(modelCounts)
    .map(([model, count]) => ({ model, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function getChatsByMonth(chats: ChatSession[]): Array<{ month: string; count: number }> {
  const monthCounts: Record<string, number> = {};
  
  chats.forEach(chat => {
    const month = new Date(chat.createdAt.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    monthCounts[month] = (monthCounts[month] || 0) + 1;
  });

  return Object.entries(monthCounts)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());
}

// ================================
// EXPORTS
// ================================

export default {
  addChatAttachment,
  removeChatAttachment,
  exportChat,
  exportAllChats,
  createChatBackup,
  restoreChatBackup,
  generateChatAnalytics
};