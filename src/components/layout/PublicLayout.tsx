import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function PublicNav() {
  const navigate = useNavigate();
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-display font-bold text-xs">GH</span>
          </div>
          <div>
            <span className="font-display text-sm font-bold tracking-tight text-foreground leading-none">GHIN</span>
            <span className="text-[10px] text-primary font-medium ml-1">Network</span>
          </div>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#patients" className="hover:text-foreground transition-colors">Patients</a>
          <a href="#providers" className="hover:text-foreground transition-colors">Providers</a>
          <a href="#attorneys" className="hover:text-foreground transition-colors">Attorneys</a>
          <a href="#funders" className="hover:text-foreground transition-colors">Funders</a>
          <Button variant="outline" size="sm" onClick={() => navigate('/login')}>Log In</Button>
        </div>
        <Button variant="outline" size="sm" className="md:hidden" onClick={() => navigate('/login')}>Log In</Button>
      </div>
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-foreground text-primary-foreground/70 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-[10px]">GH</span>
              </div>
              <span className="font-display text-sm font-bold text-primary-foreground">GHIN Network</span>
            </div>
            <p className="text-sm max-w-xs">Coordinated personal injury medical care. Zero upfront cost to patients.</p>
          </div>
          <div className="flex gap-12 text-sm">
            <div className="space-y-2">
              <p className="text-primary-foreground font-medium text-xs uppercase tracking-wider mb-3">Legal</p>
              <p className="hover:text-primary-foreground cursor-pointer">Privacy Policy</p>
              <p className="hover:text-primary-foreground cursor-pointer">Terms of Service</p>
              <p className="hover:text-primary-foreground cursor-pointer">HIPAA Notice</p>
            </div>
            <div className="space-y-2">
              <p className="text-primary-foreground font-medium text-xs uppercase tracking-wider mb-3">Contact</p>
              <p>info@gothurtnetwork.com</p>
              <p>(813) 555-0000</p>
            </div>
          </div>
        </div>
        <div className="border-t border-primary-foreground/10 mt-8 pt-6 text-xs text-center">
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
