import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Layered background for depth */}
      <div className="absolute inset-0 bg-foreground" />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-primary/10" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/10 blur-[100px]" />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />

      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <div className="w-12 h-px bg-primary mx-auto mb-8" />
        <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">Ready to Get Started?</h2>
        <p className="text-primary-foreground/60 mb-10 text-base max-w-md mx-auto leading-relaxed">
          Whether you're injured, a provider, an attorney, or a funder — there's a place for you in the Got Hurt Injury Network.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => navigate('/get-started')} className="gap-2 h-12 px-7 rounded-lg bg-primary-foreground text-foreground hover:bg-primary-foreground/90 shadow-lg shadow-primary/20">
            I Need Care <ArrowRight className="w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="gap-2 h-12 px-7 rounded-lg border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground">
            Sign In
          </Button>
        </div>
      </div>
    </section>
  );
}
