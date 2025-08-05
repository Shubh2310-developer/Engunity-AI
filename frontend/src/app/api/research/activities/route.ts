import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { getDatabase } from '@/lib/database/mongodb'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user from Supabase
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    
    if (authError || !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    const db = await getDatabase()
    const documentsCollection = db.collection('documents')
    const chatsCollection = db.collection('chats')
    const messagesCollection = db.collection('chat_messages')

    // Get recent activities from multiple sources
    const activities = []

    // Recent document uploads
    const recentDocuments = await documentsCollection
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(Math.floor(limit / 2))
      .toArray()

    recentDocuments.forEach(doc => {
      activities.push({
        activityId: `doc_${doc._id}`,
        type: 'upload' as const,
        action: doc.processing_status === 'completed' ? 'Processed' : 'Uploaded',
        target: doc.file_name || 'Document',
        targetType: 'document' as const,
        status: doc.processing_status === 'completed' ? 'completed' : 
                doc.processing_status === 'processing' ? 'in_progress' : 'completed',
        progress: doc.processing_status === 'completed' ? 100 : 
                 doc.processing_status === 'processing' ? 75 : 100,
        processingTime: 2500,
        timestamp: new Date(doc.created_at)
      })
    })

    // Recent chat activities
    const recentChats = await chatsCollection
      .find({ user_id: userId })
      .sort({ updated_at: -1 })
      .limit(Math.floor(limit / 2))
      .toArray()

    for (const chat of recentChats) {
      // Get message count for this chat
      const messageCount = await messagesCollection.countDocuments({ 
        chat_id: chat._id.toString() 
      })

      activities.push({
        activityId: `chat_${chat._id}`,
        type: 'query' as const,
        action: 'Chat Session',
        target: chat.title || 'Research Discussion',
        targetType: 'query' as const,
        status: 'completed' as const,
        progress: 100,
        result: `${messageCount} messages`,
        timestamp: new Date(chat.updated_at)
      })
    }

    // Sort all activities by timestamp and apply pagination
    const sortedActivities = activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit)

    return NextResponse.json(sortedActivities)
  } catch (error) {
    console.error('Error fetching research activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch research activities' },
      { status: 500 }
    )
  }
}