import { Heart, Users, Stethoscope, DollarSign } from 'lucide-react';

const steps = [
  { icon: Heart, title: "You're Injured", desc: "No health insurance? No problem. We connect you to care immediately.", num: '01' },
  { icon: Users, title: "CareLink Coordinates", desc: "We assign your case a care manager who handles everything.", num: '02' },
  { icon: Stethoscope, title: "Providers Treat You", desc: "On a medical lien — no upfront payment required.", num: '03' },
  { icon: DollarSign, title: "Paid at Settlement", desc: "Providers and CareLink are paid when your case settles.", num: '04' },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-24 bg-card border-y border-border/60 relative overflow-hidden">
      {/* Background depth */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-primary/[0.02] rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="mb-16">
          <span className="text-xs font-medium uppercase tracking-widest text-primary mb-3 block">Process</span>
          <h2 className="text-3xl font-display font-bold text-foreground">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden">
          {steps.map((step, i) => (
            <div key={i} className="bg-card p-7 space-y-4 group hover:bg-accent/30 transition-colors duration-300">
              <span className="font-mono-data text-xs text-muted-foreground/60">{step.num}</span>
              <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                <step.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
