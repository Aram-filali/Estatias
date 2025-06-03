// context/DashboardContext.tsx
'use client';
import { createContext, useContext } from 'react';
import { HostData } from '@/types/hostTypes';

interface DashboardContextProps {
  hostData: HostData| null;
  handleSaveProfile: (data: Partial<HostData>) => Promise<boolean>;
  handleDeleteAccount: () => Promise<boolean>;
  handleDeleteProperty: (id: string) => Promise<boolean>;
}

export const DashboardContext = createContext<DashboardContextProps | null>(null);

export const useDashboardContext = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error('useDashboardContext must be used within DashboardContext.Provider');
  return ctx;
};
