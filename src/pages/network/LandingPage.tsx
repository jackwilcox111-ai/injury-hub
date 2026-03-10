import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Heart, Users, FileCheck, DollarSign, ArrowRight, Shield, Clock, Stethoscope, Scale } from 'lucide-react';

const steps = [
  { icon: Heart, title: "You're Injured", desc: "No health insurance? No problem. We connect you to care immediately.", color: 'text-destructive' },
  { icon: Users, title: "GHIN Coordinates", desc: "We assign your case a care manager who handles everything.", color: 'text-primary' },
  { icon: Stethoscope, title: "Providers Treat You", desc: "On a medical lien — no upfront payment required.", color: 'text-success' },
  { icon: DollarSign, title: "Paid at Settlement", desc: "Providers and GHIN are paid when your case settles.", color: 'text-settled' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-foreground to-foreground/80 text-primary-foreground overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_hsl(217_72%_50%_/_0.15),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 relative z-10">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-extrabold leading-[1.1] mb-6">
              Coordinated Care.<br />
              <span className="text-primary">Zero Upfront Cost.</span>
            </h1>
            <p className="text-lg text-primary-foreground/70 mb-8 max-w-lg leading-relaxed">
              Got Hurt Injury Network connects accident victims with top medical providers, experienced PI attorneys, and case funding — all on lien.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate('/get-started')} className="gap-2 text-base h-12 px-6">
                Get Care Now <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-base h-12 px-6 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                Are You a Provider or Attorney?
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-display font-bold text-foreground mb-3">How It Works</h2>
            <p className="text-muted-foreground max-w-md mx-auto">From accident to settlement — we coordinate every step.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-6 shadow-card hover:shadow-card-hover transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <step.icon className={`w-5 h-5 ${step.color}`} />
                  </div>
                  <span className="text-xs font-mono-data text-muted-foreground">Step {i + 1}</span>
                </div>
                <h3 className="font-display text-lg font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Providers */}
      <section id="providers" className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Stethoscope className="w-5 h-5 text-success" />
                <span className="text-xs font-medium uppercase tracking-wider text-success">For Providers</span>
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">Grow Your Practice with PI Patients</h2>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex gap-3"><Shield className="w-5 h-5 text-success shrink-0 mt-0.5" /><p><span className="text-foreground font-medium">Pre-screened patients</span> — referred by attorneys with active PI cases.</p></div>
                <div className="flex gap-3"><Clock className="w-5 h-5 text-success shrink-0 mt-0.5" /><p><span className="text-foreground font-medium">Lien-basis treatment</span> — no collections, no denials. Payment at settlement.</p></div>
                <div className="flex gap-3"><FileCheck className="w-5 h-5 text-success shrink-0 mt-0.5" /><p><span className="text-foreground font-medium">Payment coordination</span> — GHIN handles lien tracking and settlement distribution.</p></div>
              </div>
              <Button className="mt-6 gap-2" onClick={() => navigate('/provider/join')}>
                Join the Provider Network <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="bg-card border border-border rounded-lg p-8 shadow-card">
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <Stethoscope className="w-8 h-8 text-success" />
                </div>
                <h3 className="font-display text-xl font-bold">Provider Network</h3>
                <p className="text-sm text-muted-foreground">6 specialties · 21+ locations · 4.8★ avg rating</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Attorneys */}
      <section id="attorneys" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="bg-card border border-border rounded-lg p-8 shadow-card order-2 md:order-1">
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Scale className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold">Attorney Partnerships</h3>
                <p className="text-sm text-muted-foreground">Care coordination · Records delivery · Lien management</p>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-5 h-5 text-primary" />
                <span className="text-xs font-medium uppercase tracking-wider text-primary">For Attorneys</span>
              </div>
              <h2 className="text-3xl font-display font-bold text-foreground mb-4">The Care Coordination Partner Your Clients Need</h2>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div className="flex gap-3"><Heart className="w-5 h-5 text-primary shrink-0 mt-0.5" /><p><span className="text-foreground font-medium">Immediate care</span> — your clients see providers within days, not weeks.</p></div>
                <div className="flex gap-3"><FileCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" /><p><span className="text-foreground font-medium">Records on time</span> — medical records delivered and organized for demand.</p></div>
                <div className="flex gap-3"><DollarSign className="w-5 h-5 text-primary shrink-0 mt-0.5" /><p><span className="text-foreground font-medium">Lien management</span> — we track, negotiate, and coordinate lien payoffs.</p></div>
              </div>
              <Button className="mt-6 gap-2" onClick={() => navigate('/attorney/join')}>
                Partner with GHIN <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* For Funders */}
      <section id="funders" className="py-20 bg-muted/50">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center gap-2 justify-center mb-4">
            <DollarSign className="w-5 h-5 text-settled" />
            <span className="text-xs font-medium uppercase tracking-wider text-settled">For Funders</span>
          </div>
          <h2 className="text-3xl font-display font-bold text-foreground mb-3">Invest in PI Medical Liens</h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-10">Case-level underwriting data, portfolio visibility, and settlement repayment tracking — all in one platform.</p>
          <div className="grid md:grid-cols-3 gap-6 max-w-3xl mx-auto mb-8">
            {[
              { title: 'Case Underwriting', desc: 'Anonymized case data with specialty, SoL, and treatment progress.' },
              { title: 'Portfolio Visibility', desc: 'Real-time view of deployed capital and active investments.' },
              { title: 'Settlement Tracking', desc: 'Automated repayment tracking when cases settle.' },
            ].map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-lg p-5 shadow-card text-left">
                <h4 className="font-medium text-foreground text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={() => navigate('/funder/join')} className="gap-2">
            Become a Network Funder <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}
