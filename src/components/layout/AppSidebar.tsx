import { useAuth, UserRole } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  LayoutDashboard, FolderOpen, Stethoscope, Scale,
  DollarSign, CalendarDays, Settings, LogOut, ShieldCheck,
  BarChart3, Link2, CheckSquare, FileSignature, Video, Landmark, Banknote,
  CreditCard, GitBranch, MessageCircle, Heart, ClipboardCheck,
  ShoppingBag, FileText, Calendar, Upload, Building2, Users, Share2, Send, UserCircle
} from 'lucide-react';

const navItems = [
  { title: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'care_manager', 'attorney'] as UserRole[] },
  { title: 'Messages', path: '/messages', icon: Video, roles: ['admin', 'care_manager', 'attorney'] as UserRole[] },
  { title: 'Tasks', path: '/tasks', icon: CheckSquare, roles: ['admin', 'care_manager', 'attorney'] as UserRole[] },
  { title: 'Cases', path: '/cases', icon: FolderOpen, roles: ['admin', 'care_manager', 'attorney'] as UserRole[] },
  { title: 'Attorneys', path: '/attorneys', icon: Scale, roles: ['admin'] as UserRole[] },
  { title: 'Providers', path: '/providers', icon: Stethoscope, roles: ['admin', 'care_manager', 'attorney'] as UserRole[] },
  { title: 'Liens & Settlements', path: '/liens', icon: DollarSign, roles: ['admin'] as UserRole[] },
  { title: 'Records & Bills', path: '/records-bills', icon: FileText, roles: ['admin', 'care_manager'] as UserRole[] },
  { title: 'Reports', path: '/reports', icon: BarChart3, roles: ['admin'] as UserRole[] },
  { title: 'Calendar', path: '/calendar', icon: CalendarDays, roles: ['admin', 'care_manager', 'attorney'] as UserRole[] },
  { title: 'Calendar', path: '/calendar', icon: CalendarDays, roles: ['admin', 'care_manager', 'attorney'] as UserRole[] },
  { title: 'Settings', path: '/settings', icon: Settings, roles: ['admin'] as UserRole[] },
  { title: 'Dashboard', path: '/provider/dashboard', icon: LayoutDashboard, roles: ['provider'] as UserRole[] },
  { title: 'Referrals', path: '/provider/dashboard?tab=referrals', icon: Send, roles: ['provider'] as UserRole[] },
  { title: 'Appointments', path: '/provider/dashboard?tab=appointments', icon: Calendar, roles: ['provider'] as UserRole[] },
  { title: 'Records & Bills', path: '/provider/dashboard?tab=records-bills', icon: FileText, roles: ['provider'] as UserRole[] },
  { title: 'Liens', path: '/provider/dashboard?tab=liens', icon: Link2, roles: ['provider'] as UserRole[] },
  { title: 'Messages', path: '/provider/dashboard?tab=messages', icon: MessageCircle, roles: ['provider'] as UserRole[] },
  { title: 'My Practice', path: '/provider/dashboard?tab=profile', icon: Building2, roles: ['provider'] as UserRole[] },
  { title: 'My Case Progress', path: '/patient/timeline', icon: GitBranch, roles: ['patient'] as UserRole[] },
  { title: 'Your Medical Team', path: '/patient/medical-team', icon: Stethoscope, roles: ['patient'] as UserRole[] },
  { title: 'My Documents', path: '/patient/documents', icon: Upload, roles: ['patient'] as UserRole[] },
  { title: 'Make a Referral', path: '/patient/referral', icon: Heart, roles: ['patient'] as UserRole[] },
  { title: 'Share Us', path: '/patient/share', icon: Share2, roles: ['patient'] as UserRole[] },
  { title: 'Messages', path: '/patient/messages', icon: MessageCircle, roles: ['patient'] as UserRole[] },
  { title: 'My Profile', path: '/patient/profile', icon: UserCircle, roles: ['patient'] as UserRole[] },
  { title: 'Portfolio', path: '/funder/dashboard', icon: Banknote, roles: ['funder'] as UserRole[] },
];

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  care_manager: 'bg-success/10 text-success',
  attorney: 'bg-warning/10 text-warning',
  provider: 'bg-settled/10 text-settled',
};

interface AppSidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

export function AppSidebar({ mobileOpen = false, onClose }: AppSidebarProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const role = profile?.role as UserRole;

  const visibleItems = navItems.filter(item => item.roles.includes(role));
  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  const handleNav = (path: string) => {
    navigate(path);
    onClose?.();
  };

  return (
    <aside className={`w-60 h-screen bg-sidebar flex flex-col border-r border-sidebar-border fixed left-0 top-0 z-40 transition-transform duration-200 ${
      mobileOpen ? 'translate-x-0' : '-translate-x-full'
    } lg:translate-x-0`}>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-xs">GH</span>
          </div>
          <div>
            <h1 className="font-display text-sm font-bold tracking-tight text-foreground leading-none">
              Got Hurt Injury Network
            </h1>
            <p className="text-[10px] text-primary font-medium mt-0.5">Care Coordination</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Menu</p>
        {visibleItems.map(item => {
          const itemPath = item.path.split('?')[0];
          const itemSearch = item.path.includes('?') ? '?' + item.path.split('?')[1] : '';
          const isActive = item.path.includes('?')
            ? location.pathname === itemPath && location.search === itemSearch
            : location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 ${
                isActive
                  ? 'bg-primary/8 text-primary font-medium shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? 'text-primary' : ''}`} />
              <span>{item.title}</span>
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
