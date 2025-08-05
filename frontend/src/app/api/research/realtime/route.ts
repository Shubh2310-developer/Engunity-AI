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
    const lastUpdate = url.searchParams.get('lastUpdate')
    const lastUpdateDate = lastUpdate ? new Date(lastUpdate) : new Date(Date.now() - 60000) // Last minute

    const db = await getDatabase()

    // Check for recent changes across collections
    const documentsCollection = db.collection('documents')
    const chatsCollection = db.collection('chats')
    const messagesCollection = db.collection('chat_messages')

    // Get recent document changes
    const recentDocuments = await documentsCollection.countDocuments({
      user_id: userId,
      $or: [
        { created_at: { $gte: lastUpdateDate } },
        { updated_at: { $gte: lastUpdateDate } }
      ]
    })

    // Get recent chat changes
    const recentChats = await chatsCollection.countDocuments({
      user_id: userId,
      $or: [
        { created_at: { $gte: lastUpdateDate } },
        { updated_at: { $gte: lastUpdateDate } }
      ]
    })

    // Get recent message changes
    const recentMessages = await messagesCollection.countDocuments({
      user_id: userId,
      created_at: { $gte: lastUpdateDate }
    })

    const hasUpdates = recentDocuments > 0 || recentChats > 0 || recentMessages > 0

    // If there are updates, get the latest activity
    let latestActivity = null
    if (hasUpdates) {
      // Get the most recent activity across all collections
      const [latestDoc, latestChat, latestMessage] = await Promise.all([
        documentsCollection.findOne(
          { user_id: userId },
          { sort: { created_at: -1 } }
        ),
        chatsCollection.findOne(
          { user_id: userId },
          { sort: { updated_at: -1 } }
        ),
        messagesCollection.findOne(
          { user_id: userId },
          { sort: { created_at: -1 } }
        )
      ])

      // Determine the most recent activity
      const activities = []
      if (latestDoc) activities.push({ type: 'document', timestamp: latestDoc.created_at, data: latestDoc })
      if (latestChat) activities.push({ type: 'chat', timestamp: latestChat.updated_at, data: latestChat })
      if (latestMessage) activities.push({ type: 'message', timestamp: latestMessage.created_at, data: latestMessage })

      if (activities.length > 0) {
        latestActivity = activities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0]
      }
    }

    return NextResponse.json({
      hasUpdates,
      updateCounts: {
        documents: recentDocuments,
        chats: recentChats,
        messages: recentMessages
      },
      latestActivity,
      serverTime: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error checking real-time updates:', error)
    return NextResponse.json(
      { error: 'Failed to check for updates' },
      { status: 500 }
    )
  }
}