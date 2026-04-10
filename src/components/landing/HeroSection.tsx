import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import heroImage from '@/assets/hero-image.jpg';

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-accent/30" />
      <div className="absolute top-20 -left-32 w-96 h-96 rounded-full bg-primary/[0.03] blur-3xl" />
      <div className="absolute bottom-10 -right-20 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />

      <div className="max-w-6xl mx-auto px-6 py-16 md:py-20 relative z-10">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/8 border border-primary/15 mb-5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-xs font-medium text-primary">National PI Care Network</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-[56px] font-display font-extrabold leading-[1.08] mb-4 text-foreground">
              Coordinated Care.{' '}
              <span className="text-primary">Zero Upfront Cost.</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground mb-7 max-w-lg leading-relaxed">
              Got Hurt Injury Network connects accident victims with top medical providers, experienced PI attorneys, and case funding — all on lien.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate('/get-started')} className="gap-2 text-sm h-12 px-7 rounded-lg shadow-lg shadow-primary/20">
                Get Care Now <ArrowRight className="w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-sm h-12 px-7 rounded-lg">
                Are You a Provider or Attorney?
              </Button>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-foreground/10">
              <img src={heroImage} alt="Medical professionals coordinating patient care in a modern clinic" className="w-full h-auto object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 to-transparent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
