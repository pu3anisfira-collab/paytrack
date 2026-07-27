import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';
import { Header } from './Header';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/import': 'Import TNG eWallet',
  '/categories': 'Categories',
  '/reports': 'Reports',
  '/export': 'Export Data',
};

export function AppLayout() {
  const location = useLocation();
  const title = TITLES[location.pathname] || 'PayTrack';
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className="flex flex-1 flex-col pb-16 lg:pb-0">
        <Header title={title} />
        <main className="flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
