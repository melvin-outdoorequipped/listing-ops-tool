// components/notification-bell.tsx
'use client';

import { useEffect, useState } from 'react';
import { Bell, BellOff, Check, X, Loader2 } from 'lucide-react';
import {
  isDesktopNotificationSupported,
  requestNotificationPermission,
  getNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  hasActiveSubscription,
  sendTestDesktopNotification,
} from '@/lib/push-notification';

interface NotificationBellProps {
  theme?: 'light' | 'dark';
  userEmail?: string;
  onPermissionChange?: (granted: boolean) => void;
}

export function NotificationBell({ 
  theme = 'dark', 
  userEmail = '',
  onPermissionChange 
}: NotificationBellProps) {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const isDark = theme === 'dark';
  const isSupported = isDesktopNotificationSupported();

  useEffect(() => {
    const checkStatus = async () => {
      if (!isSupported) return;
      
      const perm = getNotificationPermission();
      setPermission(perm);
      
      if (perm === 'granted') {
        const subscribed = await hasActiveSubscription();
        setIsSubscribed(subscribed);
      }
    };
    checkStatus();
  }, [isSupported]);

  const handleToggle = async () => {
    if (!isSupported) {
      alert('Desktop notifications are not supported on this device.');
      return;
    }

    setIsLoading(true);
    try {
      if (isSubscribed) {
        // Unsubscribe
        await unsubscribeFromPushNotifications();
        setIsSubscribed(false);
        if (onPermissionChange) onPermissionChange(false);
      } else {
        // Request permission and subscribe
        const granted = await requestNotificationPermission();
        setPermission(granted ? 'granted' : 'denied');
        
        if (granted && userEmail) {
          await subscribeToPushNotifications(userEmail);
          setIsSubscribed(true);
          if (onPermissionChange) onPermissionChange(true);
          
          // Send a welcome notification
          setTimeout(() => {
            sendTestDesktopNotification();
          }, 500);
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error);
    } finally {
      setIsLoading(false);
      setShowDropdown(false);
    }
  };

  const handleTestNotification = async () => {
    if (!isSupported) return;
    
    setIsLoading(true);
    try {
      await sendTestDesktopNotification();
    } catch (error) {
      console.error('Error sending test notification:', error);
    } finally {
      setIsLoading(false);
      setShowDropdown(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="relative">
        <div className={`rounded-xl p-2 opacity-50 cursor-not-allowed ${isDark ? 'bg-slate-800 text-slate-600' : 'bg-gray-100 text-gray-400'}`}>
          <BellOff className="h-5 w-5" />
        </div>
      </div>
    );
  }

  const textClass = isDark ? 'text-slate-300' : 'text-gray-700';
  const mutedText = isDark ? 'text-slate-400' : 'text-gray-500';
  const bgClass = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative rounded-xl p-2 transition-all ${
          isSubscribed
            ? isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            : isDark ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title="Desktop Notifications"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isSubscribed ? (
          <Bell className="h-5 w-5" />
        ) : (
          <BellOff className="h-5 w-5" />
        )}
        {isSubscribed && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
        )}
      </button>

      {showDropdown && (
        <div className={`absolute right-0 mt-2 w-80 rounded-xl border shadow-xl p-4 z-50 ${bgClass}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`text-sm font-semibold ${textClass}`}>
              Desktop Notifications
            </h3>
            <button
              onClick={() => setShowDropdown(false)}
              className={`rounded-lg p-1 transition-colors ${isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100'}`}
            >
              <X className={`h-4 w-4 ${mutedText}`} />
            </button>
          </div>

          <div className="space-y-3">
            <div className={`text-xs ${mutedText}`}>
              {isSubscribed ? (
                '🔔 Notifications are enabled. You\'ll get alerts on your desktop for new tasks.'
              ) : permission === 'denied' ? (
                '❌ Notifications blocked. Please enable in your browser settings.'
              ) : (
                '🔕 Enable desktop notifications to get alerts for new tasks, even when you\'re away.'
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleToggle}
                disabled={isLoading}
                className={`flex-1 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isSubscribed
                    ? isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-100 text-red-700 hover:bg-red-200'
                    : isDark ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSubscribed ? (
                  <>
                    <BellOff className="h-4 w-4" /> Disable
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4" /> Enable
                  </>
                )}
              </button>

              {isSubscribed && (
                <button
                  onClick={handleTestNotification}
                  disabled={isLoading}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Test
                </button>
              )}
            </div>

            {permission === 'denied' && (
              <div className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-600'} bg-amber-500/10 rounded-lg p-2`}>
                💡 To enable notifications, click the lock icon in your browser address bar and allow notifications for this site.
              </div>
            )}

            <div className={`text-[10px] ${mutedText} border-t pt-2 ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
              <span>💻 Desktop only · Requires browser to be running</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}