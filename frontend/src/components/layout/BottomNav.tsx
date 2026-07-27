import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Upload, FolderTree, Download, FileBarChart } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';

export function BottomNav() {
  const user = useAuthStore((s) => s.user);
  const items = [
    { to: '/transactions', label: 'Transactions', icon: Receipt },
    { to: '/import', label: 'Import', icon: Upload },
    ...(user?.role === 'manager'
      ? [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/categories', label: 'Categories', icon: FolderTree },
          { to: '/reports', label: 'Reports', icon: FileBarChart },
          { to: '/export', label: 'Export', icon: Download },
        ]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center overflow-x-auto border-t border-[#D8E0EA] bg-white/95 backdrop-blur-md lg:hidden shadow-lg">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 shrink-0 min-w-[68px] flex-col items-center justify-center gap-0.5 py-2 min-h-[54px] text-[11px] font-semibold transition-colors',
              isActive
                ? 'text-[#2F6BFF] font-bold bg-[#2F6BFF]/10'
                : 'text-[#5F6C7B] hover:text-[#2F6BFF]'
            )
          }
        >
          <item.icon size={18} />
          <span className="truncate px-0.5">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
