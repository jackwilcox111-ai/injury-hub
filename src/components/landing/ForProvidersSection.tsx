import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Clock, FileCheck, Stethoscope, ChevronRight } from 'lucide-react';

export function ForProvidersSection() {
  const navigate = useNavigate();

  return (
    <section id="providers" className="py-24 relative overflow-hidden">
      <div className="absolute -top-20 -right-40 w-[500px] h-[500px] rounded-full bg-success/[0.03] blur-3xl" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
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
            <div className="bg-card border border-border rounded-xl p-8 shadow-lg shadow-foreground/[0.03]">
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
  );
}
