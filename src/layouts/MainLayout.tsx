import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useSidebarStore } from '../store/sidebarStore';
// import Footer from './Footer'

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);
  const setSidebarCollapsed = useSidebarStore((s) => s.setCollapsed);
  const toggleSidebar = useSidebarStore((s) => s.toggle);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8fafc] dark:bg-slate-900 transition-colors duration-300">
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-slate-900/20 dark:bg-slate-950/40 backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      <div className="flex flex-col flex-1 min-w-0 h-full bg-[#f8fafc] dark:bg-slate-900 transition-colors duration-300">
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />

        <div className="flex-1 min-h-0 overflow-auto bg-[#f8fafc] dark:bg-slate-900">
          {children}
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
