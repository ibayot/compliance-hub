'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContextType {
  isCollapsed: boolean;
  toggleSidebar: () => void;
  drawerWidth: number;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const FULL_WIDTH = 260;
  const COLLAPSED_WIDTH = 72;

  const toggleSidebar = () => {
    setIsCollapsed((prev) => !prev);
  };

  const drawerWidth = isCollapsed ? COLLAPSED_WIDTH : FULL_WIDTH;

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggleSidebar, drawerWidth }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
