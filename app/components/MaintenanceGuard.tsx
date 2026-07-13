// components/MaintenanceGuard.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { supabase } from '@/lib/supabase/client';
import MaintenancePage from './MaintenancePage';
import AuthModal from './AuthModal';
import { Loader2 } from 'lucide-react';

interface AppUser {
  id: string;
  email: string;
}

interface MaintenanceGuardProps {
  // Render-prop child: MaintenanceGuard is the SINGLE source of truth
  // for auth state. It resolves the user once and hands it down here.
  children: (user: AppUser, isAdmin: boolean) => React.ReactNode;
  theme?: 'light' | 'dark';
}

const ADMIN_EMAILS = [
  'melvin@outdoorequipped.com',
  'jonisa@outdoorequipped.com',
  'arlie@outdoorequipped.com',
  'jogie@outdoorequipped.com'
];

// How long to wait for supabase.auth.getUser() before giving up and
// showing the login screen anyway. Prevents an infinite spinner if
// the network/session call hangs.
const AUTH_CHECK_TIMEOUT_MS = 8000;

export default function MaintenanceGuard({ children, theme = 'dark' }: MaintenanceGuardProps) {
  const { isMaintenanceMode, isAdmin, setAdminStatus } = useMaintenance();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const authCheckDoneRef = useRef(false);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isDark = theme === 'dark';

  // Check auth status - only once. This is the ONLY place in the app
  // that calls supabase.auth.getUser() / onAuthStateChange.
  useEffect(() => {
    if (authCheckDoneRef.current) return;
    authCheckDoneRef.current = true;

    console.log('🔐 Checking auth...');

    const clearAuthTimeout = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // Safety net: if the auth check hangs (bad network, stale token,
    // etc.) don't leave the user staring at a spinner forever.
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && !authChecked) {
        console.warn(`⚠️ Auth check timed out after ${AUTH_CHECK_TIMEOUT_MS}ms, showing login`);
        setUser(null);
        setAdminStatus(false);
        setShowAuth(true);
        setAuthChecked(true);
        setIsLoading(false);
      }
    }, AUTH_CHECK_TIMEOUT_MS);

    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          console.log('Auth error:', error);
          clearAuthTimeout();
          if (isMountedRef.current) {
            setUser(null);
            setAdminStatus(false);
            setShowAuth(true);
            setAuthChecked(true);
            setIsLoading(false);
          }
          return;
        }

        clearAuthTimeout();

        if (user) {
          console.log('✅ User found:', user.email);
          if (isMountedRef.current) {
            setUser(user);
            const admin = ADMIN_EMAILS.includes(user.email || '');
            console.log('Is admin:', admin);
            setAdminStatus(admin);
            setShowAuth(false);
          }
        } else {
          console.log('No user found');
          if (isMountedRef.current) {
            setUser(null);
            setAdminStatus(false);
            setShowAuth(true);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        clearAuthTimeout();
        if (isMountedRef.current) {
          setUser(null);
          setAdminStatus(false);
          setShowAuth(true);
        }
      }

      if (isMountedRef.current) {
        setAuthChecked(true);
        setIsLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 Auth state changed:', _event, session?.user?.email);
      clearAuthTimeout();

      if (isMountedRef.current) {
        if (session?.user) {
          setUser(session.user);
          const admin = ADMIN_EMAILS.includes(session.user.email || '');
          console.log('Session user is admin:', admin);
          setAdminStatus(admin);
          setShowAuth(false);
        } else {
          setUser(null);
          setAdminStatus(false);
          setShowAuth(true);
        }
        setAuthChecked(true);
        setIsLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      clearAuthTimeout();
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAdminStatus]);

  // If still loading auth, show loader
  if (isLoading || !authChecked) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${isDark ? 'bg-[#0F172A]' : 'bg-gray-100'}`}>
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // If not authenticated, show auth modal
  if (showAuth || !user) {
    console.log('🔐 Showing auth modal');
    return (
      <AuthModal
        theme={theme}
        onSuccess={async () => {
          console.log('✅ Auth success, refreshing...');
          const { data: { user } } = await supabase.auth.getUser();
          if (user && isMountedRef.current) {
            setUser(user);
            const admin = ADMIN_EMAILS.includes(user.email || '');
            setAdminStatus(admin);
            setShowAuth(false);
          }
        }}
      />
    );
  }

  // If maintenance mode is enabled AND user is NOT admin, show maintenance page
  if (isMaintenanceMode && !isAdmin) {
    console.log('🔧 Maintenance mode ON, showing maintenance page');
    return <MaintenancePage theme={theme} />;
  }

  // Auth resolved, user present, no maintenance block -> hand the
  // resolved user + admin flag down to the app via the render prop.
  console.log('🚀 Showing app');
  const appUser: AppUser = { id: user.id, email: user.email || '' };
  return <>{children(appUser, isAdmin)}</>;
}