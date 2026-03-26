import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ShieldCheck } from 'lucide-react';

export default function Login() {
  const { signIn, resetPassword, session, profile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  // Redirect if already authenticated
  if (!authLoading && session) {
    if (profile?.role === 'attorney') return <Navigate to="/attorney-portal" replace />;
    if (profile?.role === 'provider') return <Navigate to="/provider-portal" replace />;
    if (profile?.role === 'patient') return <Navigate to="/patient/dashboard" replace />;
    if (profile?.role === 'funder') return <Navigate to="/funder/dashboard" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast.error(error.message);
    setLoading(false);
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await resetPassword(email);
    if (error) toast.error(error.message);
    else toast.success('Password reset email sent');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:flex-1 bg-primary items-center justify-center relative overflow-hidden">
        <div className="relative z-10 text-center px-12 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center mx-auto mb-8">
            <span className="text-primary-foreground font-display font-bold text-2xl">CL</span>
          </div>
          <h1 className="font-display text-4xl font-bold text-primary-foreground leading-tight">
            Got Hurt Injury Network
          </h1>
          <p className="text-primary-foreground/70 mt-4 text-sm leading-relaxed">
            Personal injury medical care coordination platform.
            Manage cases, providers, attorneys, and lien tracking.
          </p>
          <div className="flex items-center justify-center gap-2 mt-8 text-primary-foreground/50 text-xs">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>HIPAA Compliant Platform</span>
          </div>
        </div>
        {/* Decorative circles */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary-foreground/5" />
        <div className="absolute -bottom-48 -left-24 w-80 h-80 rounded-full bg-primary-foreground/5" />
      </div>

      {/* Right - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-4">
              <span className="text-primary-foreground font-display font-bold text-lg">CL</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground">Got Hurt Injury Network</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold text-foreground">
              {showForgot ? 'Reset Password' : 'Welcome back'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {showForgot ? 'Enter your email to receive a reset link.' : 'Sign in to the Got Hurt Injury Network portal.'}
            </p>
          </div>

          {!showForgot ? (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-11"
                  placeholder="admin@carelink.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-medium">
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="w-full text-sm text-primary hover:text-primary/80 transition-colors text-center font-medium"
              >
                Forgot password?
              </button>
              <div className="border-t border-border pt-4 mt-2 space-y-2 text-center">
                <p className="text-xs text-muted-foreground">Don't have an account?</p>
                <a href="/get-started" className="text-sm text-primary hover:text-primary/80 font-medium block">I'm a patient → Get Started</a>
                <a href="/provider/join" className="text-sm text-muted-foreground hover:text-foreground block">I'm a provider → Join Network</a>
              </div>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-sm font-medium text-foreground">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full h-11 text-sm font-medium">
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="w-full text-sm text-primary hover:text-primary/80 transition-colors text-center font-medium"
              >
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
