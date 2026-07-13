// lib/notification-service.ts
import { supabase } from '@/lib/supabase/client';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  data?: any;
  agent_id?: string;
  agent_name?: string;
  agent_email?: string;
  tool_name?: string;
  tool_run_id?: string;
  sku_batch_id?: string;
  asin_check_id?: string;
  basecamp_generation_id?: string;
  created_at: string;
  updated_at: string;
}

// Check if browser supports desktop notifications
export const isDesktopNotificationSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  if (isMobile) return false;
  return 'Notification' in window;
};

// Request permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isDesktopNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Get current permission
export const getNotificationPermission = (): NotificationPermission => {
  if (!isDesktopNotificationSupported()) return 'denied';
  return Notification.permission;
};

// Show desktop notification
export const showDesktopNotification = (
  title: string,
  options?: NotificationOptions,
  agentName?: string
): void => {
  if (!isDesktopNotificationSupported()) return;

  if (Notification.permission !== 'granted') {
    requestNotificationPermission().then(granted => {
      if (granted) {
        const notification = new Notification(
          agentName ? `${title} (${agentName})` : title,
          {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
            ...options,
          }
        );
        setTimeout(() => notification.close(), 10000);
        notification.onclick = () => {
          window.focus();
          if (options?.data?.url) {
            window.location.href = options.data.url;
          }
          notification.close();
        };
      }
    });
    return;
  }

  try {
    const notification = new Notification(
      agentName ? `${title} (${agentName})` : title,
      {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: true,
        ...options,
      }
    );
    setTimeout(() => notification.close(), 10000);
    notification.onclick = () => {
      window.focus();
      if (options?.data?.url) {
        window.location.href = options.data.url;
      }
      notification.close();
    };
  } catch (error) {
    console.error('Error showing desktop notification:', error);
  }
};

// Create notification with full context
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  type: Notification['type'] = 'info',
  data?: any,
  agentInfo?: {
    id: string;
    name: string;
    email: string;
  },
  toolContext?: {
    toolName?: string;
    toolRunId?: string;
    skuBatchId?: string;
    asinCheckId?: string;
    basecampGenerationId?: string;
  }
): Promise<Notification | null> => {
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        type,
        data,
        read: false,
        agent_id: agentInfo?.id || null,
        agent_name: agentInfo?.name || 'System',
        agent_email: agentInfo?.email || null,
        tool_name: toolContext?.toolName || null,
        tool_run_id: toolContext?.toolRunId || null,
        sku_batch_id: toolContext?.skuBatchId || null,
        asin_check_id: toolContext?.asinCheckId || null,
        basecamp_generation_id: toolContext?.basecampGenerationId || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }

    console.log('✅ Notification created:', notification);
    return notification;
  } catch (error) {
    console.error('Error in createNotification:', error);
    return null;
  }
};

// lib/notification-service.ts - Updated subscribe function
export const subscribeToNotifications = (
  userId: string,
  onNotification: (notification: Notification) => void,
  onError?: (error: Error) => void
) => {
  console.log('📡 Setting up real-time subscription for user:', userId);
  
  const channelName = `notifications-${userId}`;
  
  const subscription = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('📨 Real-time notification received:', payload);
        const notification = payload.new as Notification;
        onNotification(notification);
      }
    )
    .subscribe((status, err) => {
      console.log(`📡 Subscription status for ${channelName}:`, status, err || '');
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to notifications');
      }
      if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error subscribing to notifications:', err);
        if (onError) onError(new Error(err?.message || 'Failed to subscribe to notifications'));
      }
      if (status === 'TIMED_OUT') {
        console.warn('⚠️ Subscription timed out, retrying...');
        if (onError) onError(new Error('Subscription timed out'));
      }
    });

  return subscription;
};

export const fetchUnreadNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    console.log('🔍 Fetching unread notifications for user:', userId);
    
    if (!userId) {
      console.warn('⚠️ No userId provided to fetchUnreadNotifications');
      return [];
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Error fetching notifications:', error);
      return [];
    }

    console.log(`📬 Found ${data?.length || 0} unread notifications for user ${userId}`);
    if (data && data.length > 0) {
      console.log('📬 First notification:', data[0]);
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Error in fetchUnreadNotifications:', error);
    return [];
  }
};

// Fetch all notifications with pagination
export const fetchAllNotifications = async (
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{ data: Notification[]; count: number }> => {
  try {
    const [{ data, error }, { count }] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId),
    ]);

    if (error) {
      console.error('Error fetching notifications:', error);
      return { data: [], count: 0 };
    }

    return { data: data || [], count: count || 0 };
  } catch (error) {
    console.error('Error in fetchAllNotifications:', error);
    return { data: [], count: 0 };
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
    }
  } catch (error) {
    console.error('Error in markNotificationAsRead:', error);
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
    }
  } catch (error) {
    console.error('Error in markAllNotificationsAsRead:', error);
  }
};

// Delete notification
export const deleteNotification = async (notificationId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
    }
  } catch (error) {
    console.error('Error in deleteNotification:', error);
  }
};

// Get notification preferences
export const getNotificationPreferences = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching notification preferences:', error);
    }

    return data || { 
      notify_on_success: true,
      notify_on_warning: true,
      notify_on_error: true,
      notify_on_info: true,
      notify_from_all: true,
      notify_from_team: true,
      notify_from_admins: false,
      desktop_enabled: true,
      email_enabled: false,
      sound_enabled: true,
    };
  } catch (error) {
    console.error('Error in getNotificationPreferences:', error);
    return null;
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (
  userId: string,
  preferences: {
    notify_on_success?: boolean;
    notify_on_warning?: boolean;
    notify_on_error?: boolean;
    notify_on_info?: boolean;
    notify_from_all?: boolean;
    notify_from_team?: boolean;
    notify_from_admins?: boolean;
    desktop_enabled?: boolean;
    email_enabled?: boolean;
    sound_enabled?: boolean;
  }
): Promise<void> => {
  try {
    const { error } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in updateNotificationPreferences:', error);
    throw error;
  }
};