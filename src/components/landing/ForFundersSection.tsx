import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, BarChart3, Receipt, ChevronRight } from 'lucide-react';
import fundersImage from '@/assets/funders-section.jpg';

export function ForFundersSection() {
  const navigate = useNavigate();

  return (
    <section id="funders" className="py-24 relative overflow-hidden">
      <div className="absolute -top-20 -right-40 w-[500px] h-[500px] rounded-full bg-settled/[0.03] blur-3xl" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid md:grid-cols-2 gap-14 items-center">
          <div>
            <span className="text-xs font-medium uppercase tracking-widest text-settled mb-3 block">For Funders</span>
            <h2 className="text-3xl font-display font-bold text-foreground mb-6">Invest in PI Medical Liens</h2>
            <div className="space-y-5">
              {[
                { icon: Search, label: 'Case Underwriting', desc: 'Anonymized case data with specialty, SoL, and treatment progress.' },
                { icon: BarChart3, label: 'Portfolio Visibility', desc: 'Real-time view of deployed capital and active investments.' },
                { icon: Receipt, label: 'Settlement Tracking', desc: 'Automated repayment tracking when cases settle.' },
              ].map((item, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-9 h-9 rounded-lg bg-settled/8 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-settled" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="mt-8 gap-2 rounded-lg" variant="outline" onClick={() => navigate('/funder/join')}>
              Become a Network Funder <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="hidden md:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-foreground/10">
              <img
                src={fundersImage}
                alt="Financial analytics dashboard showing portfolio data"
                className="w-full h-[420px] object-cover"
                loading="lazy"
                width={1280}
                height={800}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 to-transparent" />
              {/* Stats overlay */}
              <div className="absolute bottom-0 inset-x-0 bg-card/90 backdrop-blur-md border-t border-border/40 p-5">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="font-mono-data text-xl font-semibold text-foreground">$2.4M</p><p className="text-[11px] text-muted-foreground">Capital Deployed</p></div>
                  <div><p className="font-mono-data text-xl font-semibold text-foreground">87%</p><p className="text-[11px] text-muted-foreground">Recovery Rate</p></div>
                  <div><p className="font-mono-data text-xl font-semibold text-foreground">14mo</p><p className="text-[11px] text-muted-foreground">Avg Duration</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
