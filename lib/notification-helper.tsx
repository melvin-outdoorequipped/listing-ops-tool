// lib/notification-helper.ts
import { supabase } from '@/lib/supabase/client';
import { createNotification, Notification } from './notification-service';

export const notifyAllUsers = async (
  title: string,
  message: string,
  type: Notification['type'],
  data?: any,
  agentInfo?: {
    id: string;
    name: string;
    email: string;
  },
  toolContext?: any,
  excludeUserId?: string // Optional: exclude the user who triggered the action
) => {
  try {
    // Get all users from profiles table
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, name')
      .eq('status', 'active'); // Only active users

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    if (!users || users.length === 0) {
      console.warn('No users found to notify');
      return [];
    }

    const results = [];
    
    for (const user of users) {
      // Skip the user who performed the action (optional)
      if (excludeUserId && user.id === excludeUserId) continue;
      
      // Skip users who don't want this type of notification
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // Check if user has disabled this notification type
      if (prefs) {
        if (type === 'success' && prefs.notify_on_success === false) continue;
        if (type === 'warning' && prefs.notify_on_warning === false) continue;
        if (type === 'error' && prefs.notify_on_error === false) continue;
        if (prefs.notify_from_all === false) continue;
      }
      
      const result = await createNotification(
        user.id,
        title,
        message,
        type,
        data,
        agentInfo,
        toolContext
      );
      results.push(result);
    }
    
    console.log(`✅ Notified ${results.length} users`);
    return results;
  } catch (error) {
    console.error('Error notifying all users:', error);
    return [];
  }
};

// Notify users by role
export const notifyUsersByRole = async (
  roles: string[],
  title: string,
  message: string,
  type: Notification['type'],
  data?: any,
  agentInfo?: {
    id: string;
    name: string;
    email: string;
  },
  toolContext?: any,
  excludeUserId?: string
) => {
  try {
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, email, name, role')
      .in('role', roles)
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching users by role:', error);
      return [];
    }

    if (!users || users.length === 0) {
      return [];
    }

    const results = [];
    
    for (const user of users) {
      if (excludeUserId && user.id === excludeUserId) continue;
      
      const result = await createNotification(
        user.id,
        title,
        message,
        type,
        data,
        agentInfo,
        toolContext
      );
      results.push(result);
    }
    
    return results;
  } catch (error) {
    console.error('Error notifying users by role:', error);
    return [];
  }
};