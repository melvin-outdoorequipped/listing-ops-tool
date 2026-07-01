// lib/push-notification.ts

// Check if browser supports notifications (desktop)
export const isDesktopNotificationSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check if it's a desktop browser (not mobile)
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  // Only enable for desktop
  if (isMobile) return false;
  
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
};

// Request permission
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!isDesktopNotificationSupported()) {
    console.warn('Desktop notifications not supported');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
};

// Get current permission status
export const getNotificationPermission = (): NotificationPermission => {
  if (!isDesktopNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
};

// Subscribe to push notifications
export const subscribeToPushNotifications = async (userEmail: string): Promise<PushSubscription | null> => {
  if (!isDesktopNotificationSupported()) {
    console.warn('Push notifications not supported on this device');
    return null;
  }

  try {
    // Register service worker if not already
    const registration = await navigator.serviceWorker.register('/sw.js');
    
    // Get VAPID public key from server
    const response = await fetch('/api/push/vapid-public-key');
    const data = await response.json();
    
    if (!data.publicKey) {
      console.error('VAPID public key not found');
      return null;
    }
    
    // Subscribe
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: data.publicKey,
    });
    
    // Send subscription to server
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userEmail,
      }),
    });
    
    // Save subscription status
    localStorage.setItem('pushSubscribed', 'true');
    localStorage.setItem('pushSubscription', JSON.stringify(subscription.toJSON()));
    
    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPushNotifications = async (): Promise<boolean> => {
  if (!isDesktopNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Unsubscribe from server
      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
        }),
      });
      
      await subscription.unsubscribe();
      
      // Clear saved subscription
      localStorage.removeItem('pushSubscribed');
      localStorage.removeItem('pushSubscription');
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error unsubscribing:', error);
    return false;
  }
};

// Check if user has active subscription
export const hasActiveSubscription = async (): Promise<boolean> => {
  if (!isDesktopNotificationSupported()) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return false;
  }
};

// Send test notification (desktop only)
export const sendTestDesktopNotification = async (): Promise<void> => {
  if (!isDesktopNotificationSupported()) {
    console.warn('Desktop notifications not supported');
    return;
  }

  try {
    const permission = getNotificationPermission();
    if (permission !== 'granted') {
      const granted = await requestNotificationPermission();
      if (!granted) {
        console.warn('Notification permission denied');
        return;
      }
    }

    // Show notification via service worker
    const registration = await navigator.serviceWorker.ready;
    registration.showNotification('🔔 Test Notification', {
      body: 'This is a test notification from your Dashboard!',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      data: {
        url: '/',
      },
      requireInteraction: true,
      tag: 'test-notification',
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
};