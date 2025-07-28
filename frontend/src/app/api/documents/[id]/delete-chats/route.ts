import { NextRequest, NextResponse } from 'next/server';
import { ChatService } from '@/lib/database/mongodb';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Deleting all chats for document ${documentId}`);

    // Delete all chats associated with this document
    const deleteResult = await ChatService.deleteDocumentChats(documentId);

    console.log(`✅ Deleted ${deleteResult.deletedMessages} messages and ${deleteResult.deletedSessions} sessions for document ${documentId}`);

    return NextResponse.json({
      success: true,
      deletedMessages: deleteResult.deletedMessages,
      deletedSessions: deleteResult.deletedSessions,
      documentId,
      message: `Successfully deleted all chat data for document ${documentId}`
    });

  } catch (error: any) {
    console.error('❌ Error deleting document chats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete document chats',
        details: error.message,
        documentId: params.id
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const documentId = params.id;

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get chat statistics for the document
    const chatStats = await ChatService.getDocumentChatStats(documentId);

    return NextResponse.json({
      success: true,
      documentId,
      chatStats: {
        totalSessions: chatStats.totalSessions,
        totalMessages: chatStats.totalMessages,
        lastActivity: chatStats.lastActivity?.toISOString(),
        mostActiveSession: chatStats.mostActiveSession
      }
    });

  } catch (error: any) {
    console.error('❌ Error getting document chat stats:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get document chat statistics',
        details: error.message
      },
      { status: 500 }
    );
  }
}