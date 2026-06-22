// contexts/MaintenanceContext.tsx
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface MaintenanceContextType {
  isMaintenanceMode: boolean;
  isAdmin: boolean;
  checkMaintenance: () => void;
  setAdminStatus: (isAdmin: boolean) => void;
  reset: () => void;
}

const MaintenanceContext = createContext<MaintenanceContextType>({
  isMaintenanceMode: false,
  isAdmin: false,
  checkMaintenance: () => {},
  setAdminStatus: () => {},
  reset: () => {},
});

export function useMaintenance() {
  return useContext(MaintenanceContext);
}

export function MaintenanceProvider({ children }: { children: React.ReactNode }) {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const checkMaintenance = useCallback(() => {
    try {
      const saved = localStorage.getItem('lot_admin_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        setIsMaintenanceMode(settings.maintenanceMode || false);
      } else {
        setIsMaintenanceMode(false);
      }
    } catch (error) {
      console.error('Error checking maintenance:', error);
      setIsMaintenanceMode(false);
    }
  }, []);

  const setAdminStatus = useCallback((admin: boolean) => {
    console.log('Setting admin status to:', admin);
    setIsAdmin(admin);
  }, []);

  const reset = useCallback(() => {
    setIsMaintenanceMode(false);
    setIsAdmin(false);
  }, []);

  useEffect(() => {
    // Initial check
    checkMaintenance();

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'lot_admin_settings') {
        console.log('Storage changed, rechecking maintenance');
        checkMaintenance();
      }
    };

    // Listen for custom events
    const handleSettingsUpdate = () => {
      console.log('Settings updated event received');
      checkMaintenance();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('settingsUpdated', handleSettingsUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('settingsUpdated', handleSettingsUpdate);
    };
  }, [checkMaintenance]);

  return (
    <MaintenanceContext.Provider 
      value={{ 
        isMaintenanceMode, 
        isAdmin, 
        checkMaintenance, 
        setAdminStatus,
        reset 
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
}