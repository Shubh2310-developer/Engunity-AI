/**
 * Notifications API Endpoint
 * ===========================
 * 
 * GET /api/notifications - Get user notifications
 * POST /api/notifications - Create notification
 * PATCH /api/notifications - Mark notifications as read
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { getDatabase } from '@/lib/database/mongodb';

interface NotificationDoc {
  _id?: any;
  user_id: string;
  notification_id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'processing';
  title: string;
  message: string;
  read: boolean;
  metadata?: any;
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
  created_at: Date;
  updated_at: Date;
}

// GET: Retrieve user notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const url = new URL(request.url);
    
    const since = url.searchParams.get('since');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const unreadOnly = url.searchParams.get('unreadOnly') === 'true';

    const db = await getDatabase();
    const notificationsCollection = db.collection<NotificationDoc>('notifications');

    // Build query
    let query: any = { user_id: userId };
    
    if (since) {
      query.created_at = { $gte: new Date(since) };
    }
    
    if (unreadOnly) {
      query.read = false;
    }

    // Get notifications
    const notifications = await notificationsCollection
      .find(query)
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();

    // Transform for API response
    const transformedNotifications = notifications.map(notification => ({
      id: notification.notification_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      timestamp: notification.created_at.toISOString(),
      actions: notification.actions,
      metadata: notification.metadata
    }));

    // Get unread count
    const unreadCount = await notificationsCollection.countDocuments({
      user_id: userId,
      read: false
    });

    return NextResponse.json({
      notifications: transformedNotifications,
      unreadCount,
      total: notifications.length,
      hasMore: notifications.length === limit
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST: Create new notification
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { type, title, message, metadata, actions } = await request.json();

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Type, title, and message are required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const notificationsCollection = db.collection<NotificationDoc>('notifications');

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const notification: NotificationDoc = {
      user_id: userId,
      notification_id: notificationId,
      type,
      title,
      message,
      read: false,
      metadata: metadata || {},
      actions: actions || [],
      created_at: now,
      updated_at: now
    };

    await notificationsCollection.insertOne(notification);

    return NextResponse.json({
      success: true,
      notification: {
        id: notificationId,
        type,
        title,
        message,
        read: false,
        timestamp: now.toISOString(),
        actions,
        metadata
      }
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PATCH: Update notification status (mark as read/unread)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { notificationIds, read, markAll } = await request.json();

    const db = await getDatabase();
    const notificationsCollection = db.collection<NotificationDoc>('notifications');

    if (markAll) {
      // Mark all notifications as read/unread
      const result = await notificationsCollection.updateMany(
        { user_id: userId },
        {
          $set: {
            read: read !== false, // Default to true if not specified
            updated_at: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        updated: result.modifiedCount,
        action: read !== false ? 'marked_all_read' : 'marked_all_unread'
      });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'Notification IDs are required' },
        { status: 400 }
      );
    }

    // Mark specific notifications as read/unread
    const result = await notificationsCollection.updateMany(
      {
        user_id: userId,
        notification_id: { $in: notificationIds }
      },
      {
        $set: {
          read: read !== false, // Default to true if not specified
          updated_at: new Date()
        }
      }
    );

    return NextResponse.json({
      success: true,
      updated: result.modifiedCount,
      notificationIds,
      action: read !== false ? 'marked_read' : 'marked_unread'
    });

  } catch (error) {
    console.error('Error updating notifications:', error);
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }
}

// DELETE: Remove notifications
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    
    if (authError || !session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const { notificationIds, deleteAll, olderThan } = await request.json();

    const db = await getDatabase();
    const notificationsCollection = db.collection<NotificationDoc>('notifications');

    if (deleteAll) {
      // Delete all notifications
      let query: any = { user_id: userId };
      
      if (olderThan) {
        query.created_at = { $lt: new Date(olderThan) };
      }

      const result = await notificationsCollection.deleteMany(query);

      return NextResponse.json({
        success: true,
        deleted: result.deletedCount,
        action: 'deleted_all'
      });
    }

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return NextResponse.json(
        { error: 'Notification IDs are required' },
        { status: 400 }
      );
    }

    // Delete specific notifications
    const result = await notificationsCollection.deleteMany({
      user_id: userId,
      notification_id: { $in: notificationIds }
    });

    return NextResponse.json({
      success: true,
      deleted: result.deletedCount,
      notificationIds,
      action: 'deleted_specific'
    });

  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}