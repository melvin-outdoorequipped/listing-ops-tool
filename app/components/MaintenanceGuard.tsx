// components/MaintenanceGuard.tsx
'use client';

import { useEffect, useState } from 'react';
import { useMaintenance } from '@/contexts/MaintenanceContext';
import { supabase } from '@/lib/supabase/client';
import MaintenancePage from './MaintenancePage';
import AuthModal from './AuthModal';
import { Loader2 } from 'lucide-react';

interface MaintenanceGuardProps {
  children: React.ReactNode;
  theme?: 'light' | 'dark';
}

const ADMIN_EMAIL = 'melvin@outdoorequipped.com';

export default function MaintenanceGuard({ children, theme = 'dark' }: MaintenanceGuardProps) {
  const { isMaintenanceMode, isAdmin, setAdminStatus } = useMaintenance();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  const isDark = theme === 'dark';

  // Check auth status
  useEffect(() => {
    const checkAuth = async () => {
      console.log('Checking auth...');
      setIsLoading(true);
      
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.log('Auth error:', error);
          setUser(null);
          setAdminStatus(false);
          setShowAuth(true);
          setIsLoading(false);
          setAuthChecked(true);
          return;
        }

        if (user) {
          console.log('User found:', user.email);
          setUser(user);
          const admin = user.email === ADMIN_EMAIL;
          console.log('Is admin:', admin);
          setAdminStatus(admin);
          setShowAuth(false);
        } else {
          console.log('No user found');
          setUser(null);
          setAdminStatus(false);
          setShowAuth(true);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
        setAdminStatus(false);
        setShowAuth(true);
      }
      
      setIsLoading(false);
      setAuthChecked(true);
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.email);
      
      if (session?.user) {
        setUser(session.user);
        const admin = session.user.email === ADMIN_EMAIL;
        console.log('Session user is admin:', admin);
        setAdminStatus(admin);
        setShowAuth(false);
      } else {
        setUser(null);
        setAdminStatus(false);
        setShowAuth(true);
      }
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, [setAdminStatus]);

  // Log current state for debugging
  useEffect(() => {
    console.log('MaintenanceGuard state:', {
      isLoading,
      authChecked,
      hasUser: !!user,
      isAdmin,
      isMaintenanceMode,
      showAuth,
      userEmail: user?.email
    });
  }, [isLoading, authChecked, user, isAdmin, isMaintenanceMode, showAuth]);

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
    console.log('Showing auth modal');
    return <AuthModal theme={theme} onSuccess={() => {
      console.log('Auth success, refreshing...');
      setShowAuth(false);
      // Re-check auth after successful login
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          setUser(user);
          const admin = user.email === ADMIN_EMAIL;
          setAdminStatus(admin);
        }
      });
    }} />;
  }

  // If maintenance mode is enabled AND user is NOT admin, show maintenance page
  if (isMaintenanceMode && !isAdmin) {
    console.log('Maintenance mode ON and user is not admin, showing maintenance page');
    return <MaintenancePage theme={theme} />;
  }

  // If maintenance mode is ON but user IS admin
  if (isMaintenanceMode && isAdmin) {
    console.log('Maintenance mode ON but user IS admin, showing app');
  }

  // Otherwise, show the app
  console.log('Showing app');
  return <>{children}</>;
}