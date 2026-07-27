import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Receipt, Upload, FolderTree, Download, FileBarChart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/utils/cn';
import logoDarkImg from '@/assets/logo dark.png';
import logoNameDarkImg from '@/assets/logo name dark.png';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, managerOnly: true },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/import', label: 'Import TNG', icon: Upload },
  { to: '/categories', label: 'Categories', icon: FolderTree, managerOnly: true },
  { to: '/reports', label: 'Reports', icon: FileBarChart, managerOnly: true },
  { to: '/export', label: 'Export', icon: Download, managerOnly: true },
];

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const user = useAuthStore((s) => s.user);

  return (
    <aside
      className={cn(
        'hidden h-screen sticky top-0 flex-col border-r border-[#0F234F]/30 bg-[#0F234F] text-white lg:flex transition-all duration-300 shadow-2xl z-20',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* ── SIDEBAR HEADER & LOGO ────────────────────────────────────────── */}
      <div className={cn('flex items-center py-4 px-4 border-b border-white/10', collapsed ? 'justify-center' : 'justify-between')}>
        <div className="flex items-center gap-2.5 min-w-0">
          <img src={logoDarkImg} alt="PayTrack Logo" className="h-9 w-9 shrink-0 object-contain drop-shadow-sm" />
          {!collapsed && (
            <div className="transition-opacity duration-300 min-w-0">
              <img src={logoNameDarkImg} alt="PayTrack" className="h-6 w-auto object-contain" />
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* ── NAVIGATION LINKS ────────────────────────────────────────────── */}
      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {navItems
          .filter((item) => !item.managerOnly || user?.role === 'manager')
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                  isActive
                    ? 'bg-[#2F6BFF] text-white shadow-lg shadow-[#2F6BFF]/30 font-bold'
                    : 'text-white/75 hover:bg-white/10 hover:text-white',
                  collapsed && 'justify-center px-0'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={18} className="shrink-0" />
              {!collapsed && <span className="transition-opacity duration-300">{item.label}</span>}
            </NavLink>
          ))}
      </nav>

      {/* ── USER FOOTER ─────────────────────────────────────────────────── */}
      <div className={cn('border-t border-white/10 p-4 bg-[#0A1838]', collapsed && 'flex justify-center')}>
        {collapsed ? (
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2F6BFF]/20 text-[#15C7B8] font-bold text-xs border border-[#15C7B8]/30"
            title={`${user?.fullName} (${user?.role})`}
          >
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </div>
        ) : (
          <div className="transition-opacity duration-300">
            <p className="text-[11px] font-medium text-white/50">Signed in as</p>
            <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
            <p className="text-xs font-semibold capitalize text-[#15C7B8]">{user?.role}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
