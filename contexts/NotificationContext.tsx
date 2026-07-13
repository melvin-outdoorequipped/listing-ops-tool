// contexts/NotificationContext.tsx (Fixed - No infinite loop)
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  Notification,
  fetchUnreadNotifications,
  subscribeToNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  showDesktopNotification,
  getNotificationPermission,
  requestNotificationPermission,
  isDesktopNotificationSupported,
  createNotification,
} from '@/lib/notification-service';

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  createNotificationWithAgent: (
    title: string,
    message: string,
    type: Notification['type'],
    data?: any,
    agentName?: string,
    agentEmail?: string,
    agentId?: string,
    toolContext?: any
  ) => Promise<Notification | null>;
  permission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  isSupported: boolean;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ 
  children, 
  userId,
  currentUserName = 'User',
  currentUserEmail = '',
  currentUserId = ''
}: { 
  children: React.ReactNode; 
  userId: string;
  currentUserName?: string;
  currentUserEmail?: string;
  currentUserId?: string;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  
  // ✅ Use refs instead of state to prevent infinite loops
  const subscriptionRef = useRef<any>(null);
  const isMountedRef = useRef(true);
  const isSubscribedRef = useRef(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Refresh notifications
  const refreshNotifications = useCallback(async () => {
    if (!userId) {
      console.warn('⚠️ Cannot refresh: No userId');
      return;
    }
    
    try {
      console.log('🔄 Refreshing notifications for user:', userId);
      setLoading(true);
      
      const unread = await fetchUnreadNotifications(userId);
      
      if (isMountedRef.current) {
        setNotifications(unread);
        console.log(`✅ Refreshed ${unread.length} notifications`);
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Error refreshing notifications:', error);
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId]);

  // Load initial notifications
  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      setLoading(true);
      try {
        const unread = await fetchUnreadNotifications(userId);
        if (isMountedRef.current) {
          setNotifications(unread);
          console.log(`📬 Loaded ${unread.length} unread notifications`);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    loadNotifications();

    const supported = isDesktopNotificationSupported();
    setIsSupported(supported);
    if (supported) {
      setPermission(getNotificationPermission());
    }

    return () => {
      isMountedRef.current = false;
    };
  }, [userId]);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, refreshNotifications]);

  // ✅ FIXED: Subscribe to real-time notifications - ONLY runs when userId changes
  useEffect(() => {
    // Don't subscribe if no userId or already subscribed
    if (!userId || isSubscribedRef.current) {
      return;
    }

    console.log('🔄 Setting up real-time subscription for user:', userId);

    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }

    // ✅ Use the subscribeToNotifications function from the service
    const subscription = subscribeToNotifications(
      userId,
      (notification) => {
        console.log('📨 Real-time notification received!', notification);
        
        // Add notification to state
        setNotifications(prev => {
          if (prev.some(n => n.id === notification.id)) {
            return prev;
          }
          return [notification, ...prev];
        });

        // Show desktop notification
        if (isSupported && permission === 'granted') {
          showDesktopNotification(
            notification.title,
            {
              body: notification.message,
              icon: '/favicon.ico',
              tag: notification.id,
              data: {
                url: notification.data?.url || '/',
                notificationId: notification.id,
              },
            },
            notification.agent_name
          );
        }

        playNotificationSound();
      },
      (error) => {
        console.error('❌ Subscription error:', error);
        isSubscribedRef.current = false;
      }
    );

    subscriptionRef.current = subscription;
    isSubscribedRef.current = true;

    return () => {
      console.log('🔌 Cleaning up subscription');
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
        isSubscribedRef.current = false;
      }
    };
  }, [userId]); // ✅ Only depends on userId - NOT on isSubscribed

  const markAsRead = useCallback(async (id: string) => {
    await markNotificationAsRead(id);
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    await markAllNotificationsAsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [userId]);

  const addNotification = useCallback((notification: Notification) => {
    setNotifications(prev => {
      if (prev.some(n => n.id === notification.id)) {
        return prev;
      }
      return [notification, ...prev];
    });
    
    if (isSupported && permission === 'granted') {
      showDesktopNotification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id,
      }, notification.agent_name);
    }
  }, [isSupported, permission]);

  const createNotificationWithAgent = useCallback(async (
    title: string,
    message: string,
    type: Notification['type'] = 'info',
    data?: any,
    agentName?: string,
    agentEmail?: string,
    agentId?: string,
    toolContext?: any
  ) => {
    const agentInfo = {
      id: agentId || currentUserId || userId,
      name: agentName || currentUserName || 'System',
      email: agentEmail || currentUserEmail || '',
    };

    const notification = await createNotification(
      userId,
      title,
      message,
      type,
      data,
      agentInfo,
      toolContext
    );

    if (notification) {
      setNotifications(prev => {
        if (prev.some(n => n.id === notification.id)) {
          return prev;
        }
        return [notification, ...prev];
      });

      if (isSupported && permission === 'granted') {
        showDesktopNotification(title, {
          body: message,
          icon: '/favicon.ico',
          tag: notification.id,
          data: {
            url: data?.url || '/',
            notificationId: notification.id,
          },
        }, agentInfo.name);
      }

      playNotificationSound();
    }

    return notification;
  }, [userId, currentUserName, currentUserEmail, currentUserId, isSupported, permission]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;
    const granted = await requestNotificationPermission();
    setPermission(granted ? 'granted' : 'denied');
    return granted;
  }, [isSupported]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        addNotification,
        createNotificationWithAgent,
        permission,
        requestPermission,
        isSupported,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

function playNotificationSound() {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {
    // Silent fail
  }
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}