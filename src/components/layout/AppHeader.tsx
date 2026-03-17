import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useState, useRef, useEffect } from 'react';
import { FlagBadge } from '@/components/global/FlagBadge';

const routeNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/cases': 'Cases',
  '/providers': 'Providers',
  '/attorneys': 'Attorneys',
  '/liens': 'Liens & Settlements',
  '/calendar': 'Calendar',
  '/settings': 'Settings',
  '/attorney-portal': 'Attorney Portal',
  '/provider-portal': 'Provider Portal',
  '/provider/rcm': 'RCM Billing',
  '/provider/messages': 'Messages',
};

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-primary/10 text-primary',
  care_manager: 'bg-success/10 text-success',
  attorney: 'bg-warning/10 text-warning',
  provider: 'bg-settled/10 text-settled',
};

export function AppHeader() {
  const { profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const basePath = '/' + location.pathname.split('/').filter(Boolean)[0];
  const moduleName = routeNames[basePath] || 'Portal';

  const { data: flaggedCases } = useQuery({
    queryKey: ['flagged-cases'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cases_with_counts')
        .select('id, case_number, patient_name, flag')
        .not('flag', 'is', null);
      return data || [];
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-7 fixed top-0 left-60 right-0 z-20">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Portal</span>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium">{moduleName}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Bell */}
        <div ref={bellRef} className="relative">
          <button
            onClick={() => setBellOpen(!bellOpen)}
            className="relative p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent"
          >
            <Bell className="w-[18px] h-[18px]" />
            {flaggedCases && flaggedCases.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full ring-2 ring-card" />
            )}
          </button>

          {bellOpen && flaggedCases && flaggedCases.length > 0 && (
            <div className="absolute right-0 top-11 w-80 bg-card border border-border rounded-xl shadow-elevated z-50 max-h-80 overflow-y-auto">
              <div className="p-3 border-b border-border">
                <p className="text-xs font-semibold text-foreground">Alerts ({flaggedCases.length})</p>
              </div>
              {flaggedCases.map(c => (
                <button
                  key={c.id}
                  onClick={() => { navigate(`/cases/${c.id}`); setBellOpen(false); }}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-accent transition-colors border-b border-border last:border-0"
                >
                  <div>
                    <p className="text-sm text-foreground font-medium">{c.patient_name}</p>
                    <p className="text-[11px] font-mono text-muted-foreground">{c.case_number}</p>
                  </div>
                  <FlagBadge flag={c.flag} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-border" />

        {/* User */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm text-foreground font-medium leading-tight">{profile?.full_name}</p>
            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium ${roleBadgeStyles[profile?.role || ''] || ''}`}>
              {profile?.role?.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
