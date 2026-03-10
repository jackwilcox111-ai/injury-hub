import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Heart, Users, FileCheck, DollarSign, ArrowRight, Shield, Clock, Stethoscope, Scale, ChevronRight } from 'lucide-react';
import heroImage from '@/assets/hero-image.jpg';

const steps = [
  { icon: Heart, title: "You're Injured", desc: "No health insurance? No problem. We connect you to care immediately.", num: '01' },
  { icon: Users, title: "CareLink Coordinates", desc: "We assign your case a care manager who handles everything.", num: '02' },
  { icon: Stethoscope, title: "Providers Treat You", desc: "On a medical lien — no upfront payment required.", num: '03' },
  { icon: DollarSign, title: "Paid at Settlement", desc: "Providers and CareLink are paid when your case settles.", num: '04' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/30" />
        <div className="max-w-6xl mx-auto px-6 py-28 md:py-40 relative z-10">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 mb-8">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              <span className="text-xs font-medium text-primary">National PI Care Network</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-display font-extrabold leading-[1.08] mb-6 text-foreground">
              Coordinated Care.{' '}
              <span className="text-primary">Zero Upfront Cost.</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-10 max-w-lg leading-relaxed">
              CareLink connects accident victims with top medical providers, experienced PI attorneys, and case funding — all on lien.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate('/get-started')} className="gap-2 text-sm h-12 px-7 rounded-lg">
                Get Care Now <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-sm h-12 px-7 rounded-lg">
                Are You a Provider or Attorney?
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-card border-y border-border/60">
        <div className="max-w-6xl mx-auto px-6">
          <div className="mb-16">
            <span className="text-xs font-medium uppercase tracking-widest text-primary mb-3 block">Process</span>
            <h2 className="text-3xl font-display font-bold text-foreground">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden">
            {steps.map((step, i) => (
              <div key={i} className="bg-card p-7 space-y-4">
                <span className="font-mono-data text-xs text-muted-foreground/60">{step.num}</span>
                <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center">
                  <step.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display text-base font-bold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Providers */}
      <section id="providers" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-16 items-center">
            <div className="md:col-span-3">
              <span className="text-xs font-medium uppercase tracking-widest text-success mb-3 block">For Providers</span>
              <h2 className="text-3xl font-display font-bold text-foreground mb-6">Grow Your Practice with PI Patients</h2>
              <div className="space-y-5">
                {[
                  { icon: Shield, label: 'Pre-screened patients', desc: 'Referred by attorneys with active PI cases.' },
                  { icon: Clock, label: 'Lien-basis treatment', desc: 'No collections, no denials. Payment at settlement.' },
                  { icon: FileCheck, label: 'Payment coordination', desc: 'CareLink handles lien tracking and settlement distribution.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-9 h-9 rounded-lg bg-success/8 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-8 gap-2 rounded-lg" onClick={() => navigate('/provider/join')}>
                Join the Provider Network <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="md:col-span-2">
              <div className="bg-card border border-border rounded-xl p-8 shadow-card">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-success/8 flex items-center justify-center mx-auto">
                    <Stethoscope className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground">Provider Network</h3>
                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div><p className="font-mono-data text-xl font-semibold text-foreground">6</p><p className="text-[11px] text-muted-foreground">Specialties</p></div>
                    <div><p className="font-mono-data text-xl font-semibold text-foreground">21+</p><p className="text-[11px] text-muted-foreground">Locations</p></div>
                    <div><p className="font-mono-data text-xl font-semibold text-foreground">4.8</p><p className="text-[11px] text-muted-foreground">Avg Rating</p></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Attorneys */}
      <section id="attorneys" className="py-24 bg-card border-y border-border/60">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-5 gap-16 items-center">
            <div className="md:col-span-2 order-2 md:order-1">
              <div className="bg-background border border-border rounded-xl p-8 shadow-card">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mx-auto">
                    <Scale className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground">Attorney Partnerships</h3>
                  <p className="text-sm text-muted-foreground">Care coordination · Records delivery · Lien management</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-3 order-1 md:order-2">
              <span className="text-xs font-medium uppercase tracking-widest text-primary mb-3 block">For Attorneys</span>
              <h2 className="text-3xl font-display font-bold text-foreground mb-6">The Care Coordination Partner Your Clients Need</h2>
              <div className="space-y-5">
                {[
                  { icon: Heart, label: 'Immediate care', desc: 'Your clients see providers within days, not weeks.' },
                  { icon: FileCheck, label: 'Records on time', desc: 'Medical records delivered and organized for demand.' },
                  { icon: DollarSign, label: 'Lien management', desc: 'We track, negotiate, and coordinate lien payoffs.' },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="mt-8 gap-2 rounded-lg" onClick={() => navigate('/attorney/join')}>
                Partner with CareLink <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* For Funders */}
      <section id="funders" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-medium uppercase tracking-widest text-settled mb-3 block">For Funders</span>
            <h2 className="text-3xl font-display font-bold text-foreground mb-3">Invest in PI Medical Liens</h2>
            <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">Case-level underwriting data, portfolio visibility, and settlement repayment tracking — all in one platform.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-px bg-border rounded-xl overflow-hidden max-w-3xl mx-auto mb-10">
            {[
              { title: 'Case Underwriting', desc: 'Anonymized case data with specialty, SoL, and treatment progress.' },
              { title: 'Portfolio Visibility', desc: 'Real-time view of deployed capital and active investments.' },
              { title: 'Settlement Tracking', desc: 'Automated repayment tracking when cases settle.' },
            ].map((item, i) => (
              <div key={i} className="bg-card p-6">
                <h4 className="font-semibold text-sm text-foreground mb-2">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Button variant="outline" onClick={() => navigate('/funder/join')} className="gap-2 rounded-lg">
              Become a Network Funder <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-display font-bold text-primary-foreground mb-4">Ready to Get Started?</h2>
          <p className="text-primary-foreground/70 mb-8 text-sm max-w-md mx-auto">
            Whether you're injured, a provider, an attorney, or a funder — there's a place for you in the CareLink network.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="lg" variant="secondary" onClick={() => navigate('/get-started')} className="gap-2 h-12 px-7 rounded-lg bg-primary-foreground text-foreground hover:bg-primary-foreground/90">
              I Need Care <ArrowRight className="w-4 h-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="gap-2 h-12 px-7 rounded-lg border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              Sign In
            </Button>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
