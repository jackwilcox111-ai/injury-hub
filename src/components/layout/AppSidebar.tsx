import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Stethoscope, Scale,
  DollarSign, CalendarDays, Settings, LogOut, ShieldCheck
} from 'lucide-react';

const navItems = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'care_manager'] as UserRole[] },
  { title: 'Cases', path: '/cases', icon: FolderOpen, roles: ['admin', 'care_manager'] as UserRole[] },
  { title: 'Providers', path: '/providers', icon: Stethoscope, roles: ['admin', 'care_manager'] as UserRole[] },
  { title: 'Attorneys', path: '/attorneys', icon: Scale, roles: ['admin'] as UserRole[] },
  { title: 'Liens & Settlements', path: '/liens', icon: DollarSign, roles: ['admin'] as UserRole[] },
  { title: 'Calendar', path: '/calendar', icon: CalendarDays, roles: ['admin', 'care_manager', 'attorney', 'provider'] as UserRole[] },
  { title: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] as UserRole[] },
];

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-primary/20 text-primary',
  care_manager: 'bg-success/20 text-success',
  attorney: 'bg-warning/20 text-warning',
  provider: 'bg-settled/20 text-settled',
};

export function AppSidebar() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = profile?.role as UserRole;

  const visibleItems = navItems.filter(item => item.roles.includes(role));
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <aside className="w-60 h-screen bg-sidebar flex flex-col border-r border-sidebar-border fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-sidebar-border">
        <h1 className="font-display text-lg font-extrabold tracking-tight text-foreground">
          GOT HURT
        </h1>
        <p className="text-xs text-primary font-mono">Injury Network</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-primary font-medium'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.title}</span>
              {item.title === 'Calendar' && (
                <span className="ml-auto text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded font-mono">Soon</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-success">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="font-mono">HIPAA Compliant</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center text-xs font-mono font-medium text-foreground">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground truncate">{profile?.full_name || 'User'}</p>
            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-mono ${roleBadgeStyles[role] || 'bg-muted text-muted-foreground'}`}>
              {role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-secondary"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
