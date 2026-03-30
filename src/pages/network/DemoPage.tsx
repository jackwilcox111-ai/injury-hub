import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import demoDashboard from '@/assets/demo-dashboard.png';
import {
  LayoutDashboard, FolderOpen, Stethoscope, Scale, DollarSign,
  FileSignature, BarChart3, ShieldCheck, Users, Banknote,
  CheckSquare, MessageCircle, CalendarDays, GitBranch, ArrowRight,
  CreditCard, ClipboardCheck
} from 'lucide-react';

const features = [
  {
    icon: LayoutDashboard,
    title: 'Kanban Case Pipeline',
    description: 'Visual drag-and-drop pipeline tracking every case from intake through demand prep. Five-stage workflow with real-time status updates, urgency flags, and SoL countdowns.',
    tags: ['Admin', 'Care Manager'],
    color: 'hsl(var(--primary))',
    mockUI: (
      <div className="mt-4 space-y-1.5">
        {[
          { stage: 'Intake', count: 12, pct: 100 },
          { stage: 'Referrals Sent', count: 8, pct: 67 },
          { stage: 'In Treatment', count: 15, pct: 100 },
          { stage: 'Records Pending', count: 6, pct: 50 },
          { stage: 'Demand Prep', count: 4, pct: 33 },
        ].map(s => (
          <div key={s.stage} className="flex items-center gap-2">
            <span className="text-[8px] font-medium text-muted-foreground w-20 truncate">{s.stage}</span>
            <div className="flex-1 h-2 bg-accent/50 rounded-full overflow-hidden">
              <div className="h-full bg-primary/60 rounded-full" style={{ width: `${s.pct}%` }} />
            </div>
            <span className="text-[9px] font-mono font-medium text-foreground w-5 text-right">{s.count}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: FolderOpen,
    title: 'Comprehensive Case Detail',
    description: 'Deep case profiles with tabbed views: billing charges, insurance eligibility, policy details, Colossus scoring, medical records, demand letters, and patient engagement — all in one place.',
    tags: ['Admin', 'Attorney'],
    color: 'hsl(var(--warning))',
    mockUI: (
      <div className="mt-4 rounded-lg border border-border/50 bg-card overflow-hidden">
        <div className="flex border-b border-border/50">
          {['Overview', 'Billing', 'Insurance', 'Records', 'Demand'].map((tab, i) => (
            <div key={tab} className={`px-3 py-1.5 text-[8px] font-medium ${i === 0 ? 'bg-primary/10 text-primary border-b-2 border-primary' : 'text-muted-foreground'}`}>
              {tab}
            </div>
          ))}
        </div>
        <div className="p-2.5 space-y-1.5">
          {[75, 60, 45, 80].map((w, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-1.5 w-16 bg-muted-foreground/15 rounded" />
              <div className="h-1.5 rounded bg-muted-foreground/10" style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    icon: Stethoscope,
    title: 'Provider Network Management',
    description: 'Manage your medical provider network with credentialing tracking, lien management, patient assignments, RCM billing, and interactive map-based directory for public discovery.',
    tags: ['Admin', 'Provider'],
    color: 'hsl(var(--settled))',
    mockUI: (
      <div className="mt-4 grid grid-cols-3 gap-1.5">
        {[
          { label: 'Active Providers', val: '32' },
          { label: 'Avg Rating', val: '4.7★' },
          { label: 'Specialties', val: '8' },
        ].map(s => (
          <div key={s.label} className="bg-accent/40 rounded-lg p-2 text-center">
            <p className="text-sm font-bold text-foreground">{s.val}</p>
            <p className="text-[7px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Scale,
    title: 'Attorney Portal & Marketplace',
    description: 'Customizable attorney dashboards with configurable visibility settings. Built-in case marketplace lets attorneys discover and accept pre-qualified cases that match their criteria.',
    tags: ['Attorney'],
    color: 'hsl(var(--warning))',
    mockUI: (
      <div className="mt-4 space-y-1.5">
        {['Case Timeline', 'Medical Specials', 'Policy Limits', 'Demand Letters', 'Settlement Worksheet'].map((item, i) => (
          <div key={item} className="flex items-center justify-between bg-accent/30 rounded-md px-2.5 py-1.5">
            <span className="text-[9px] text-foreground/80">{item}</span>
            <div className={`w-6 h-3 rounded-full ${i < 3 ? 'bg-primary' : 'bg-muted-foreground/20'}`}>
              <div className={`w-2.5 h-2.5 rounded-full bg-white mt-[1px] ${i < 3 ? 'ml-auto mr-[1px]' : 'ml-[1px]'}`} />
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Banknote,
    title: 'Funding & Lien Management',
    description: 'Track funding requests, lien amounts, settlement estimates, and payment disbursements. Full financial lifecycle visibility from treatment through resolution.',
    tags: ['Admin', 'Funder'],
    color: 'hsl(var(--success))',
    mockUI: (
      <div className="mt-4">
        <div className="flex items-end gap-1 h-16">
          {[40, 55, 35, 70, 60, 80, 45, 65, 75, 50, 85, 70].map((h, i) => (
            <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, backgroundColor: i >= 9 ? 'hsl(var(--primary))' : 'hsl(var(--primary) / 0.2)' }} />
          ))}
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[7px] text-muted-foreground">Jan</span>
          <span className="text-[7px] text-muted-foreground">Dec</span>
        </div>
      </div>
    ),
  },
  {
    icon: BarChart3,
    title: 'Reporting & Analytics',
    description: 'Executive-level dashboards with case volume trends, settlement analytics, provider performance metrics, and revenue cycle tracking across the entire network.',
    tags: ['Admin'],
    color: 'hsl(var(--primary))',
    mockUI: (
      <div className="mt-4 grid grid-cols-2 gap-1.5">
        {[
          { label: 'Total Cases', val: '1,247' },
          { label: 'Avg Settlement', val: '$34.2K' },
          { label: 'Recovery Rate', val: '87%' },
          { label: 'Demand Sent', val: '312' },
        ].map(s => (
          <div key={s.label} className="bg-accent/40 rounded-lg p-2">
            <p className="text-xs font-bold text-foreground">{s.val}</p>
            <p className="text-[7px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: ShieldCheck,
    title: 'HIPAA-Compliant Security',
    description: 'Role-based access control, audit logging, session timeout protection, and PHI safeguards built into every layer. Document visibility controls ensure data is only seen by authorized parties.',
    tags: ['All Roles'],
    color: 'hsl(var(--success))',
    mockUI: (
      <div className="mt-4 space-y-1.5">
        {[
          { label: 'Role-Based Access', icon: Users },
          { label: 'Audit Trail', icon: ClipboardCheck },
          { label: 'Session Timeouts', icon: CalendarDays },
          { label: 'Encrypted Storage', icon: ShieldCheck },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 bg-accent/30 rounded-md px-2.5 py-1.5">
            <s.icon className="w-3 h-3 text-success" />
            <span className="text-[9px] text-foreground/80">{s.label}</span>
            <CheckSquare className="w-2.5 h-2.5 text-success ml-auto" />
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: FolderOpen,
    title: 'Records Management',
    description: 'Centralized document storage with role-based visibility controls. Upload, organize, and share medical records, legal documents, and billing files — all tracked with audit trails.',
    tags: ['Admin', 'Provider'],
    color: 'hsl(var(--warning))',
    mockUI: (
      <div className="mt-4 space-y-1.5">
        {[
          { name: 'MRI Report - Lumbar', type: 'Medical', date: 'Mar 12' },
          { name: 'Police Report #4821', type: 'Legal', date: 'Mar 8' },
          { name: 'Insurance VOB', type: 'Billing', date: 'Mar 5' },
          { name: 'Surgical Notes', type: 'Medical', date: 'Feb 28' },
        ].map(d => (
          <div key={d.name} className="flex items-center gap-2 bg-accent/30 rounded-md px-2.5 py-1.5">
            <FolderOpen className="w-3 h-3 text-warning shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-[9px] text-foreground/80 truncate block">{d.name}</span>
            </div>
            <span className="text-[7px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{d.type}</span>
            <span className="text-[7px] text-muted-foreground">{d.date}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: MessageCircle,
    title: 'Communication & Messaging',
    description: 'HIPAA-compliant messaging between patients, attorneys, providers, and care managers. Threaded conversations tied to cases with read receipts and role-based delivery.',
    tags: ['All Roles'],
    color: 'hsl(var(--primary))',
    mockUI: (
      <div className="mt-4 space-y-1.5">
        {[
          { from: 'Care Manager', msg: 'Records received from ortho...', time: '2m ago', unread: true },
          { from: 'Attorney Office', msg: 'Policy limits confirmed at $100K', time: '1h ago', unread: false },
          { from: 'Patient', msg: 'Completed MRI appointment today', time: '3h ago', unread: false },
        ].map(m => (
          <div key={m.from} className="flex items-start gap-2 bg-accent/30 rounded-md px-2.5 py-1.5">
            <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${m.unread ? 'bg-primary' : 'bg-transparent'}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-medium text-foreground">{m.from}</span>
                <span className="text-[7px] text-muted-foreground">{m.time}</span>
              </div>
              <p className="text-[8px] text-muted-foreground truncate">{m.msg}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: CalendarDays,
    title: 'Appointment Scheduling',
    description: 'Centralized calendar for managing patient appointments across the provider network. Track scheduling, interpreter needs, specialty referrals, and no-show follow-ups.',
    tags: ['Admin', 'Provider'],
    color: 'hsl(var(--settled))',
    mockUI: (
      <div className="mt-4">
        <div className="grid grid-cols-7 gap-0.5">
          {['M','T','W','T','F','S','S'].map(d => (
            <div key={d} className="text-[7px] text-center text-muted-foreground font-medium py-0.5">{d}</div>
          ))}
          {Array.from({ length: 28 }).map((_, i) => {
            const hasAppt = [3, 7, 10, 14, 17, 21, 24].includes(i);
            const isToday = i === 14;
            return (
              <div key={i} className={`text-[8px] text-center py-1 rounded ${isToday ? 'bg-primary text-primary-foreground font-bold' : hasAppt ? 'bg-settled/15 text-settled font-medium' : 'text-muted-foreground/60'}`}>
                {i + 1}
              </div>
            );
          })}
        </div>
      </div>
    ),
  },
  {
    icon: GitBranch,
    title: 'Patient Treatment Timeline',
    description: 'Visual timeline tracking every milestone — from accident date through treatment, records collection, and settlement. Patients and attorneys see real-time progress at a glance.',
    tags: ['Patient', 'Attorney'],
    color: 'hsl(var(--primary))',
    mockUI: (
      <div className="mt-4 relative pl-4">
        <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
        {[
          { label: 'Accident Reported', date: 'Jan 15', done: true },
          { label: 'Initial Consultation', date: 'Jan 22', done: true },
          { label: 'MRI Completed', date: 'Feb 8', done: true },
          { label: 'Surgery Scheduled', date: 'Mar 20', done: false },
        ].map(e => (
          <div key={e.label} className="flex items-start gap-2 mb-2 relative">
            <div className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 -ml-4 mt-0.5 ${e.done ? 'bg-primary border-primary' : 'bg-card border-muted-foreground/30'}`} />
            <div className="flex-1">
              <span className="text-[9px] text-foreground/80 font-medium">{e.label}</span>
              <span className="text-[7px] text-muted-foreground ml-1.5">{e.date}</span>
            </div>
          </div>
        ))}
      </div>
    ),
  },
];

const rolePortals = [
  { role: 'Patient', icon: Users, description: 'Personal dashboard, treatment timeline, secure messaging, and appointment tracking', color: 'hsl(var(--primary))' },
  { role: 'Provider', icon: Stethoscope, description: 'Patient management, RCM billing, lien tracking, and document management', color: 'hsl(var(--settled))' },
  { role: 'Attorney', icon: Scale, description: 'Case oversight, demand letters, settlement worksheets, and marketplace access', color: 'hsl(var(--warning))' },
  { role: 'Funder', icon: Banknote, description: 'Portfolio management, case underwriting, and settlement recovery tracking', color: 'hsl(var(--success))' },
  
  { role: 'Case Management', icon: LayoutDashboard, description: 'Full operational control with pipeline management, reporting, and network oversight', color: 'hsl(var(--destructive))' },
];

export default function DemoPage() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      <Helmet>
        <title>Platform Demo | Got Hurt Injury Network</title>
        <meta name="description" content="See how the Got Hurt Injury Network platform coordinates personal injury care with powerful tools for case management, provider networks, and settlement tracking." />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.04] via-transparent to-transparent" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/[0.03] rounded-full blur-3xl" />
        <div className="max-w-5xl mx-auto px-6 py-16 md:py-24 text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-6">
            <LayoutDashboard className="w-3.5 h-3.5" />
            Platform Overview
          </div>
          <h1 className="text-3xl md:text-5xl font-display font-extrabold text-foreground mb-5 leading-tight">
            The Command Center for<br />Personal Injury Care
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-8">
            See how Got Hurt coordinates every stakeholder — patients, providers, attorneys, and funders — through a single intelligent platform. Here's what powers the network behind the scenes.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate('/get-started')} className="text-sm h-11 px-6">
              Get Started <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="text-sm h-11 px-6">
              Log In
            </Button>
          </div>

          {/* Dashboard Screenshot */}
          <div className="mt-12 max-w-4xl mx-auto">
            <div className="rounded-xl overflow-hidden shadow-2xl border border-border/50 bg-card">
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-muted/50 border-b border-border/50">
                <div className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                <span className="text-[10px] text-muted-foreground ml-2 font-mono">Got Hurt Injury Network — Dashboard</span>
              </div>
              <img
                src={demoDashboard}
                alt="Got Hurt Injury Network admin dashboard showing case pipeline, active cases, and stale case alerts"
                className="w-full h-auto"
                loading="lazy"
                width={1952}
                height={1247}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Role Portals Overview */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-xl md:text-2xl font-display font-bold text-foreground mb-3">
            One Platform, Six Dedicated Portals
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Every stakeholder gets a tailored experience with role-specific tools and dashboards.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {rolePortals.map(p => (
            <div key={p.role} className="border border-border rounded-xl p-4 bg-card hover:shadow-md transition-shadow">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${p.color}15` }}>
                <p.icon className="w-4.5 h-4.5" style={{ color: p.color }} />
              </div>
              <h3 className="font-display font-bold text-sm text-foreground mb-1">{p.role} Portal</h3>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Deep Dives */}
      <section className="bg-accent/30 border-y border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-xl md:text-2xl font-display font-bold text-foreground mb-3">
              Inside the Platform
            </h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Powerful tools designed specifically for the personal injury workflow.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="border border-border rounded-xl p-5 bg-card hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${f.color}12` }}>
                    <f.icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <div className="flex gap-1">
                    {f.tags.map(tag => (
                      <span key={tag} className="text-[8px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <h3 className="font-display font-bold text-sm text-foreground mb-1.5">{f.title}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{f.description}</p>
                {f.mockUI}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="text-xl md:text-2xl font-display font-bold text-foreground mb-3">
          Ready to See It in Action?
        </h2>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto mb-8">
          Join the Got Hurt Injury Network today. Whether you're a patient seeking care, a provider looking to grow your practice, or an attorney building your caseload — we're ready.
        </p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button size="lg" onClick={() => navigate('/get-started')} className="text-sm h-11 px-6">
            Get Started as a Patient
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/provider/join')} className="text-sm h-11 px-6">
            Join as a Provider
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/attorney/join')} className="text-sm h-11 px-6">
            Join as an Attorney
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-6">
          Questions? Call us at <a href="tel:800-729-1570" className="text-primary font-medium hover:underline">800-729-1570</a>
        </p>
      </section>
    </PublicLayout>
  );
}
