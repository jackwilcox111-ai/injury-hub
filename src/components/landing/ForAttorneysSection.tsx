import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Heart, FileCheck, DollarSign, Scale, ChevronRight } from 'lucide-react';

export function ForAttorneysSection() {
  const navigate = useNavigate();

  return (
    <section id="attorneys" className="py-24 bg-card border-y border-border/60 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/[0.03] rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-5 gap-16 items-center">
          <div className="md:col-span-2 order-2 md:order-1">
            <div className="bg-background border border-border rounded-xl p-8 shadow-lg shadow-foreground/[0.03]">
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
  );
}
