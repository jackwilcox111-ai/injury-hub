import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PHIBanner } from '@/components/global/PHIBanner';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/global/StatusBadge';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Users, Stethoscope, DollarSign, TrendingUp, Calendar,
  FileText, MessageCircle, AlertTriangle, ArrowRight, Clock, Upload,
} from 'lucide-react';

export default function ProviderDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['provider-dash-appointments'],
    queryFn: async () => {
      const { data } = await supabase.from('appointments')
        .select('*, cases!appointments_case_id_fkey(id, case_number, patient_name, status, specialty)')
        .order('scheduled_date', { ascending: true });
      return data || [];
    },
  });

  const { data: charges } = useQuery({
    queryKey: ['provider-dash-charges'],
    queryFn: async () => {
      const { data } = await supabase.from('charges')
        .select('*, cases!charges_case_id_fkey(case_number, patient_name)')
        .order('service_date', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const { data: allCharges } = useQuery({
    queryKey: ['provider-dash-charges-all'],
    queryFn: async () => {
      const { data } = await supabase.from('charges')
        .select('charge_amount, paid_amount, status');
      return data || [];
    },
  });

  const { data: unreadMessages } = useQuery({
    queryKey: ['provider-dash-unread'],
    queryFn: async () => {
      const { count } = await supabase.from('video_messages')
        .select('*', { count: 'exact', head: true })
        .eq('viewed', false);
      return count || 0;
    },
  });

  const { data: pendingDocs } = useQuery({
    queryKey: ['provider-dash-pending-docs'],
    queryFn: async () => {
      const { count } = await supabase.from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('signed', false);
      return count || 0;
    },
  });

  // Derived metrics
  const caseMap = new Map<string, any>();
  appointments?.forEach(a => {
    const c = (a as any).cases;
    if (c?.id) caseMap.set(c.id, c);
  });
  const patientCount = caseMap.size;

  const todayAppts = appointments?.filter(a =>
    a.scheduled_date && isToday(parseISO(a.scheduled_date))
  ) || [];

  const upcomingAppts = appointments?.filter(a =>
    a.scheduled_date && (isToday(parseISO(a.scheduled_date)) || isTomorrow(parseISO(a.scheduled_date)) || parseISO(a.scheduled_date) > new Date())
  )?.slice(0, 6) || [];

  const noShows = appointments?.filter(a => a.status === 'No-Show').length || 0;
  const completed = appointments?.filter(a => a.status === 'Completed').length || 0;
  const total = appointments?.length || 0;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const totalBilled = allCharges?.reduce((sum, c) => sum + (c.charge_amount || 0), 0) || 0;
  const totalCollected = allCharges?.reduce((sum, c) => sum + (c.paid_amount || 0), 0) || 0;
  const pendingCharges = allCharges?.filter(c => c.status === 'Submitted').length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-xl">Provider Dashboard</h2>
        <Skeleton className="h-96 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PHIBanner />

      {/* Header */}
      <div>
        <h2 className="font-display text-xl">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}
        </h2>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')} · {todayAppts.length} appointment{todayAppts.length !== 1 ? 's' : ''} today
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard icon={Users} label="Active Patients" value={patientCount} />
        <MetricCard icon={Stethoscope} label="Total Appointments" value={total} sub={`${todayAppts.length} today`} />
        <MetricCard icon={TrendingUp} label="Completion Rate" value={`${completionRate}%`} variant="success" />
        <MetricCard icon={DollarSign} label="Total Billed" value={`$${totalBilled.toLocaleString()}`} variant="emerald" />
        <MetricCard icon={DollarSign} label="Total Collected" value={`$${totalCollected.toLocaleString()}`} variant="blue" />
      </div>

      {/* Alerts Row */}
      {(noShows > 0 || (unreadMessages || 0) > 0 || (pendingDocs || 0) > 0 || pendingCharges > 0) && (
        <div className="flex flex-wrap gap-2">
          {noShows > 0 && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="w-3 h-3" /> {noShows} No-Show{noShows > 1 ? 's' : ''}
            </Badge>
          )}
          {(unreadMessages || 0) > 0 && (
            <Badge variant="secondary" className="gap-1 text-xs cursor-pointer" onClick={() => navigate('/provider/messages')}>
              <MessageCircle className="w-3 h-3" /> {unreadMessages} Unread Message{(unreadMessages || 0) > 1 ? 's' : ''}
            </Badge>
          )}
          {(pendingDocs || 0) > 0 && (
            <Badge variant="outline" className="gap-1 text-xs cursor-pointer" onClick={() => navigate('/provider-portal')}>
              <FileText className="w-3 h-3" /> {pendingDocs} Unsigned Document{(pendingDocs || 0) > 1 ? 's' : ''}
            </Badge>
          )}
          {pendingCharges > 0 && (
            <Badge variant="outline" className="gap-1 text-xs cursor-pointer" onClick={() => navigate('/provider/rcm')}>
              <Clock className="w-3 h-3" /> {pendingCharges} Pending Charge{pendingCharges > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-accent/50">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> Upcoming Appointments
            </h3>
            <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => navigate('/provider-portal')}>
              View All <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
          {upcomingAppts.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Patient</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Specialty</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {upcomingAppts.map(a => {
                  const c = (a as any).cases;
                  const dateLabel = a.scheduled_date
                    ? isToday(parseISO(a.scheduled_date))
                      ? 'Today'
                      : isTomorrow(parseISO(a.scheduled_date))
                        ? 'Tomorrow'
                        : format(parseISO(a.scheduled_date), 'MMM d')
                    : '—';
                  return (
                    <tr key={a.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-medium text-foreground">{c?.patient_name || '—'}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{c?.case_number}</p>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono">
                        <span className={dateLabel === 'Today' ? 'text-primary font-semibold' : ''}>{dateLabel}</span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.specialty || c?.specialty || '—'}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={a.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="px-4 py-12 text-center text-muted-foreground text-sm">No upcoming appointments</div>
          )}
        </div>

        {/* Right Column: Quick Actions + Recent Charges */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
            <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-xs"
              onClick={() => navigate('/provider-portal')}>
              <Users className="w-3.5 h-3.5" /> View My Patients
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-xs"
              onClick={() => navigate('/provider/rcm')}>
              <DollarSign className="w-3.5 h-3.5" /> RCM Billing
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-xs"
              onClick={() => navigate('/provider/messages')}>
              <MessageCircle className="w-3.5 h-3.5" /> Messages
              {(unreadMessages || 0) > 0 && (
                <Badge variant="destructive" className="ml-auto text-[9px] h-4 px-1">{unreadMessages}</Badge>
              )}
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-start gap-2 text-xs"
              onClick={() => navigate('/calendar')}>
              <Calendar className="w-3.5 h-3.5" /> Calendar
            </Button>
          </div>

          {/* Recent Charges */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-accent/50">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" /> Recent Charges
              </h3>
            </div>
            {charges && charges.length > 0 ? (
              <div className="divide-y divide-border">
                {charges.map(c => (
                  <div key={c.id} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-foreground">{(c as any).cases?.patient_name}</p>
                      <p className="text-[11px] text-muted-foreground">{c.cpt_code} · {c.service_date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-semibold">${c.charge_amount.toLocaleString()}</p>
                      <Badge variant={c.status === 'Paid' ? 'default' : 'outline'} className="text-[9px]">{c.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground text-xs">No charges yet</div>
            )}
          </div>
        </div>
      </div>

      {/* HIPAA Footer */}
      <div className="text-[10px] text-muted-foreground text-center py-2 border-t border-border mt-8">
        This portal contains Protected Health Information (PHI). Access is restricted to authorized personnel only. All activity is logged in compliance with HIPAA regulations.
      </div>
    </div>
  );
}

/* Reusable metric card */
function MetricCard({ icon: Icon, label, value, sub, variant }: {
  icon: any; label: string; value: string | number; sub?: string;
  variant?: 'success' | 'emerald' | 'blue';
}) {
  const colorMap = {
    success: 'text-success',
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
  };
  const bgMap = {
    success: '',
    emerald: 'bg-emerald-50 border-emerald-200',
    blue: 'bg-blue-50 border-blue-200',
  };
  const valueColor = variant ? colorMap[variant] : 'text-foreground';
  const cardBg = variant && variant !== 'success' ? bgMap[variant] : 'bg-card';

  return (
    <div className={`${cardBg} border border-border rounded-xl p-4 text-center`}>
      <Icon className={`w-4 h-4 mx-auto mb-1 ${variant ? colorMap[variant] : 'text-primary'}`} />
      <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}
