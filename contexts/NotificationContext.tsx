// contexts/NotificationContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  const unreadCount = notifications.filter(n => !n.read).length;

  // Load initial notifications
  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      setLoading(true);
      const unread = await fetchUnreadNotifications(userId);
      setNotifications(unread);
      setLoading(false);
    };

    loadNotifications();

    const supported = isDesktopNotificationSupported();
    setIsSupported(supported);
    if (supported) {
      setPermission(getNotificationPermission());
    }
  }, [userId]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!userId) return;

    const subscription = subscribeToNotifications(
      userId,
      (notification) => {
        setNotifications(prev => [notification, ...prev]);

        if (isSupported && permission === 'granted') {
          showDesktopNotification(notification.title, {
            body: notification.message,
            icon: '/favicon.ico',
            tag: notification.id,
            data: {
              url: notification.data?.url || '/',
              notificationId: notification.id,
            },
          }, notification.agent_name);
        }

        playNotificationSound();
      },
      (error) => {
        console.error('Notification subscription error:', error);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, isSupported, permission]);

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
    setNotifications(prev => [notification, ...prev]);
    
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
      setNotifications(prev => [notification, ...prev]);

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