import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ShieldAlert } from 'lucide-react';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_MS = 2 * 60 * 1000;  // warn 2 min before

export function SessionTimeoutProvider({ children }: { children: React.ReactNode }) {
  const { session, signOut } = useAuth();
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const warningRef = useRef<ReturnType<typeof setTimeout>>();

  const resetTimers = useCallback(() => {
    if (!session) return;
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    setShowWarning(false);

    warningRef.current = setTimeout(() => {
      setShowWarning(true);
    }, TIMEOUT_MS - WARNING_MS);

    timeoutRef.current = setTimeout(() => {
      signOut();
    }, TIMEOUT_MS);
  }, [session, signOut]);

  useEffect(() => {
    if (!session) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'] as const;
    const handler = () => resetTimers();

    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetTimers();

    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      clearTimeout(timeoutRef.current);
      clearTimeout(warningRef.current);
    };
  }, [session, resetTimers]);

  return (
    <>
      {children}
      <AlertDialog open={showWarning && !!session} onOpenChange={() => {}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              Session Expiring Soon
            </AlertDialogTitle>
            <AlertDialogDescription>
              For HIPAA compliance, your session will end in 2 minutes due to inactivity.
              Click below to stay signed in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={resetTimers}>Stay Signed In</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
