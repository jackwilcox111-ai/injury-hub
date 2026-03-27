import { ReactNode, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu, X } from 'lucide-react';


export function PublicNav() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/90 backdrop-blur-lg border-b border-border/60">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="font-display text-base font-bold tracking-tight text-foreground">Got Hurt Injury Network</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-6 text-[13px] font-medium text-muted-foreground">
            <a href="/#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <Link to="/find-providers" className="hover:text-foreground transition-colors">Find a Provider</Link>
            <a href="/#providers" className="hover:text-foreground transition-colors">Providers</a>
            <a href="/#attorneys" className="hover:text-foreground transition-colors">Attorneys</a>
            <a href="/#funders" className="hover:text-foreground transition-colors">Funders</a>
            <Link to="/demo" className="hover:text-foreground transition-colors">Demo</Link>
            <Link to="/resources" className="hover:text-foreground transition-colors">Resources</Link>
          </div>
          <div className="flex items-center gap-2.5">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="text-[13px] font-medium">
              Log In
            </Button>
            <Button size="sm" onClick={() => navigate('/get-started')} className="text-[13px] h-9 px-4">
              Get Started
            </Button>
          </div>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden p-2 text-muted-foreground" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-card border-t border-border px-6 py-4 space-y-3">
          <a href="/#how-it-works" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>How It Works</a>
          <Link to="/find-providers" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Find a Provider</Link>
          <a href="/#providers" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Providers</a>
          <a href="/#attorneys" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Attorneys</a>
          <a href="/#funders" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Funders</a>
          <Link to="/demo" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Demo</Link>
          <Link to="/resources" className="block text-sm text-muted-foreground hover:text-foreground" onClick={() => setMobileOpen(false)}>Resources</Link>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => { navigate('/login'); setMobileOpen(false); }} className="flex-1">Log In</Button>
            <Button size="sm" onClick={() => { navigate('/get-started'); setMobileOpen(false); }} className="flex-1">Get Started</Button>
          </div>
        </div>
      )}
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-foreground text-primary-foreground/60 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="font-display text-sm font-bold text-primary-foreground">Got Hurt Injury Network</span>
            </div>
            <p className="text-sm max-w-sm leading-relaxed">
              Coordinated personal injury medical care. Connecting patients, providers, attorneys, and funders — all on one platform.
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-primary-foreground/90 font-medium text-xs uppercase tracking-widest">Legal</p>
            <p className="text-sm hover:text-primary-foreground cursor-pointer transition-colors">Privacy Policy</p>
            <p className="text-sm hover:text-primary-foreground cursor-pointer transition-colors">Terms of Service</p>
            <p className="text-sm hover:text-primary-foreground cursor-pointer transition-colors">HIPAA Notice</p>
          </div>
          <div className="space-y-3">
            <p className="text-primary-foreground/90 font-medium text-xs uppercase tracking-widest">Contact</p>
            <p className="text-sm">info@gothurtinjurynetwork.com</p>
            <p className="text-sm">800-729-1570</p>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 mt-12 pt-6 text-xs text-center text-primary-foreground/40">
          © {new Date().getFullYear()} Got Hurt Injury Network. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <PublicNav />
      <main className="pt-16">{children}</main>
      <PublicFooter />
    </div>
  );
}
