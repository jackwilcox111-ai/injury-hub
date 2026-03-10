import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

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
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">
            GOT HURT
          </h1>
          <p className="text-primary font-mono text-sm mt-1">Injury Network</p>
          <p className="text-muted-foreground text-xs mt-4 font-mono">GHIN Operations Portal</p>
        </div>

        {!showForgot ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground font-mono">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="bg-card border-border text-foreground"
                placeholder="admin@gothurtnetwork.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-muted-foreground font-mono">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="bg-card border-border text-foreground"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="w-full text-xs text-muted-foreground hover:text-primary transition-colors text-center"
            >
              Forgot password?
            </button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-xs text-muted-foreground font-mono">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="bg-card border-border text-foreground"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            <button
              type="button"
              onClick={() => setShowForgot(false)}
              className="w-full text-xs text-muted-foreground hover:text-primary transition-colors text-center"
            >
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
