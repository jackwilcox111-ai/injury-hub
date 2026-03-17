import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Stethoscope, Scale,
  DollarSign, CalendarDays, Settings, LogOut, ShieldCheck,
  BarChart3, Link2, CheckSquare, FileSignature, Video, Landmark, Banknote,
  CreditCard, GitBranch, MessageCircle, Heart
} from 'lucide-react';

const navItems = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'care_manager'] as UserRole[] },
  { title: 'Cases', path: '/cases', icon: FolderOpen, roles: ['admin', 'care_manager'] as UserRole[] },
  { title: 'Providers', path: '/providers', icon: Stethoscope, roles: ['admin', 'care_manager'] as UserRole[] },
  { title: 'Attorneys', path: '/attorneys', icon: Scale, roles: ['admin'] as UserRole[] },
  { title: 'Liens & Settlements', path: '/liens', icon: DollarSign, roles: ['admin'] as UserRole[] },
  { title: 'Demand Letters', path: '/demand-letters', icon: FileSignature, roles: ['admin', 'care_manager'] as UserRole[] },
  { title: 'Messages', path: '/messages', icon: Video, roles: ['admin', 'care_manager'] as UserRole[] },
  { title: 'RCM', path: '/rcm', icon: Landmark, roles: ['admin'] as UserRole[] },
  { title: 'Funding', path: '/funding', icon: Banknote, roles: ['admin'] as UserRole[] },
  { title: 'Reports', path: '/reports', icon: BarChart3, roles: ['admin'] as UserRole[] },
  { title: 'Referrals', path: '/referrals', icon: Link2, roles: ['admin'] as UserRole[] },
  { title: 'Tasks', path: '/tasks', icon: CheckSquare, roles: ['admin', 'care_manager'] as UserRole[] },
  { title: 'Calendar', path: '/calendar', icon: CalendarDays, roles: ['admin', 'care_manager', 'attorney', 'provider'] as UserRole[] },
  { title: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] as UserRole[] },
  // Provider sidebar
  { title: 'RCM Billing', path: '/provider/rcm', icon: CreditCard, roles: ['provider'] as UserRole[] },
  // Patient sidebar
  { title: 'My Dashboard', path: '/patient/dashboard', icon: Heart, roles: ['patient'] as UserRole[] },
  { title: 'Timeline', path: '/patient/timeline', icon: GitBranch, roles: ['patient'] as UserRole[] },
  { title: 'Messages', path: '/patient/messages', icon: MessageCircle, roles: ['patient'] as UserRole[] },
];

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  care_manager: 'bg-success/10 text-success',
  attorney: 'bg-warning/10 text-warning',
  provider: 'bg-settled/10 text-settled',
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
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-xs">CL</span>
          </div>
          <div>
            <h1 className="font-display text-sm font-bold tracking-tight text-foreground leading-none">
              CareLink
            </h1>
            <p className="text-[10px] text-primary font-medium mt-0.5">Care Coordination</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Menu</p>
        {visibleItems.map(item => {
          const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
                isActive
                  ? 'bg-primary/8 text-primary font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-primary' : ''}`} />
              <span>{item.title}</span>
              {item.title === 'Calendar' && (
                <span className="ml-auto text-[9px] bg-warning/15 text-warning px-1.5 py-0.5 rounded-full font-medium">Soon</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-4 space-y-3">
        <div className="flex items-center gap-1.5 text-[10px] text-success">
          <ShieldCheck className="w-3 h-3" />
          <span className="font-medium tracking-wide uppercase">HIPAA Compliant</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-foreground font-medium truncate">{profile?.full_name || 'User'}</p>
            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-0.5 ${roleBadgeStyles[role] || 'bg-muted text-muted-foreground'}`}>
              {role?.replace('_', ' ')}
            </span>
          </div>
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/5"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
