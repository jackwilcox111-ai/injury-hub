import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export function CtaSection() {
  const navigate = useNavigate();

  return (
    <section className="relative py-24 overflow-hidden">
      {/* Light on-brand background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-accent/30 to-primary/[0.04]" />
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/[0.06] blur-[120px]" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full bg-accent/20 blur-[100px]" />

      <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
        <div className="w-12 h-px bg-primary mx-auto mb-8" />
        <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">Ready to Get Started?</h2>
        <p className="text-muted-foreground mb-10 text-base max-w-md mx-auto leading-relaxed">
          Whether you're injured, a provider, an attorney, or a funder — there's a place for you in the Got Hurt Injury Network.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" onClick={() => navigate('/get-started')} className="gap-2 h-12 px-7 rounded-lg shadow-lg">
            I Need Care <ArrowRight className="w-4 h-4" />
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="gap-2 h-12 px-7 rounded-lg">
            Sign In
          </Button>
        </div>
      </div>
    </section>
  );
}
