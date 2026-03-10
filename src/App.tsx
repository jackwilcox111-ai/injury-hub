import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import CasesList from "./pages/CasesList";
import CaseDetail from "./pages/CaseDetail";
import ProvidersPage from "./pages/ProvidersPage";
import AttorneysPage from "./pages/AttorneysPage";
import LiensPage from "./pages/LiensPage";
import CalendarPage from "./pages/CalendarPage";
import SettingsPage from "./pages/SettingsPage";
import AttorneyPortal from "./pages/AttorneyPortal";
import ProviderPortal from "./pages/ProviderPortal";
import NotFound from "./pages/NotFound";
import { ReactNode } from "react";

const queryClient = new QueryClient();

function RequireAuth({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-mono text-sm">Loading...</p></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (roles && profile && !roles.includes(profile.role)) {
    if (profile.role === 'attorney') return <Navigate to="/attorney-portal" replace />;
    if (profile.role === 'provider') return <Navigate to="/provider-portal" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

function AuthRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-mono text-sm">Loading...</p></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (profile?.role === 'attorney') return <Navigate to="/attorney-portal" replace />;
  if (profile?.role === 'provider') return <Navigate to="/provider-portal" replace />;
  return <Navigate to="/dashboard" replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<AuthRedirect />} />
            <Route path="/dashboard" element={<RequireAuth roles={['admin','care_manager']}><AppLayout><Dashboard /></AppLayout></RequireAuth>} />
            <Route path="/cases" element={<RequireAuth roles={['admin','care_manager']}><AppLayout><CasesList /></AppLayout></RequireAuth>} />
            <Route path="/cases/:id" element={<RequireAuth roles={['admin','care_manager']}><AppLayout><CaseDetail /></AppLayout></RequireAuth>} />
            <Route path="/providers" element={<RequireAuth roles={['admin','care_manager']}><AppLayout><ProvidersPage /></AppLayout></RequireAuth>} />
            <Route path="/attorneys" element={<RequireAuth roles={['admin']}><AppLayout><AttorneysPage /></AppLayout></RequireAuth>} />
            <Route path="/liens" element={<RequireAuth roles={['admin']}><AppLayout><LiensPage /></AppLayout></RequireAuth>} />
            <Route path="/calendar" element={<RequireAuth><AppLayout><CalendarPage /></AppLayout></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth roles={['admin']}><AppLayout><SettingsPage /></AppLayout></RequireAuth>} />
            <Route path="/attorney-portal" element={<RequireAuth roles={['attorney']}><AppLayout><AttorneyPortal /></AppLayout></RequireAuth>} />
            <Route path="/provider-portal" element={<RequireAuth roles={['provider']}><AppLayout><ProviderPortal /></AppLayout></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
