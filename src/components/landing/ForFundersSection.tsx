import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import fundersImage from '@/assets/funders-section.jpg';

export function ForFundersSection() {
  const navigate = useNavigate();

  return (
    <section id="funders" className="py-24 relative overflow-hidden">
      <div className="absolute top-10 right-0 w-80 h-80 bg-settled/[0.04] rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="text-center mb-14">
          <span className="text-xs font-medium uppercase tracking-widest text-settled mb-3 block">For Funders</span>
          <h2 className="text-3xl font-display font-bold text-foreground mb-3">Invest in PI Medical Liens</h2>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm leading-relaxed">Case-level underwriting data, portfolio visibility, and settlement repayment tracking — all in one platform.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-center max-w-5xl mx-auto mb-10">
          {/* Image */}
          <div className="rounded-2xl overflow-hidden shadow-2xl shadow-foreground/10">
            <img
              src={fundersImage}
              alt="Financial analytics dashboard showing portfolio data"
              className="w-full h-[320px] object-cover"
              loading="lazy"
              width={1280}
              height={800}
            />
          </div>

          {/* Feature cards */}
          <div className="space-y-4">
            {[
              { title: 'Case Underwriting', desc: 'Anonymized case data with specialty, SoL, and treatment progress.' },
              { title: 'Portfolio Visibility', desc: 'Real-time view of deployed capital and active investments.' },
              { title: 'Settlement Tracking', desc: 'Automated repayment tracking when cases settle.' },
            ].map((item, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-5 hover:bg-accent/30 transition-colors duration-300">
                <h4 className="font-semibold text-sm text-foreground mb-1.5">{item.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center">
          <Button variant="outline" onClick={() => navigate('/funder/join')} className="gap-2 rounded-lg">
            Become a Network Funder <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
