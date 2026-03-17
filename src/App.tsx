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
import ReportingDashboard from "./pages/ReportingDashboard";
import ReferralTracking from "./pages/ReferralTracking";
import TaskDashboard from "./pages/TaskDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/network/LandingPage";
import PatientIntake from "./pages/network/PatientIntake";
import ProviderJoin from "./pages/network/ProviderJoin";
import AttorneyJoin from "./pages/network/AttorneyJoin";
import FunderJoin from "./pages/network/FunderJoin";
import AdminDemandLetters from "./pages/AdminDemandLetters";
import AdminMessages from "./pages/AdminMessages";
import AdminRCM from "./pages/AdminRCM";
import AdminFunding from "./pages/AdminFunding";
import ProviderRCM from "./pages/ProviderRCM";
import PatientTimeline from "./pages/PatientTimeline";
import PatientMessages from "./pages/PatientMessages";
import { ReactNode } from "react";

const queryClient = new QueryClient();

function RequireAuth({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-mono text-sm">Loading...</p></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (roles && profile && !roles.includes(profile.role)) {
    if (profile.role === 'attorney') return <Navigate to="/attorney-portal" replace />;
    if (profile.role === 'provider') return <Navigate to="/provider-portal" replace />;
    if (profile.role === 'patient') return <Navigate to="/patient/dashboard" replace />;
    if (profile.role === 'funder') return <Navigate to="/funder/dashboard" replace />;
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
  if (profile?.role === 'patient') return <Navigate to="/patient/dashboard" replace />;
  if (profile?.role === 'funder') return <Navigate to="/funder/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
}

// Placeholder for funder portal
function FunderDashboardPlaceholder() {
  return <div className="p-8"><h1 className="text-2xl font-display font-bold">Funder Portal</h1><p className="text-muted-foreground mt-2">Coming in Phase 2 — your portfolio dashboard will appear here.</p></div>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/get-started" element={<PatientIntake />} />
            <Route path="/provider/join" element={<ProviderJoin />} />
            <Route path="/attorney/join" element={<AttorneyJoin />} />
            <Route path="/funder/join" element={<FunderJoin />} />
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin portal routes */}
            <Route path="/home" element={<AuthRedirect />} />
            <Route path="/dashboard" element={<RequireAuth roles={['admin','care_manager']}><AppLayout><Dashboard /></AppLayout></RequireAuth>} />
            <Route path="/cases" element={<RequireAuth roles={['admin','care_manager']}><AppLayout><CasesList /></AppLayout></RequireAuth>} />
            <Route path="/cases/:id" element={<RequireAuth roles={['admin','care_manager']}><AppLayout><CaseDetail /></AppLayout></RequireAuth>} />
            <Route path="/providers" element={<RequireAuth roles={['admin','care_manager']}><AppLayout><ProvidersPage /></AppLayout></RequireAuth>} />
            <Route path="/attorneys" element={<RequireAuth roles={['admin']}><AppLayout><AttorneysPage /></AppLayout></RequireAuth>} />
            <Route path="/liens" element={<RequireAuth roles={['admin']}><AppLayout><LiensPage /></AppLayout></RequireAuth>} />
            <Route path="/calendar" element={<RequireAuth><AppLayout><CalendarPage /></AppLayout></RequireAuth>} />
            <Route path="/reports" element={<RequireAuth roles={['admin']}><AppLayout><ReportingDashboard /></AppLayout></RequireAuth>} />
            <Route path="/referrals" element={<RequireAuth roles={['admin']}><AppLayout><ReferralTracking /></AppLayout></RequireAuth>} />
            <Route path="/tasks" element={<RequireAuth roles={['admin','care_manager']}><AppLayout><TaskDashboard /></AppLayout></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth roles={['admin']}><AppLayout><SettingsPage /></AppLayout></RequireAuth>} />
            <Route path="/demand-letters" element={<RequireAuth roles={['admin','care_manager']}><AppLayout><AdminDemandLetters /></AppLayout></RequireAuth>} />
            <Route path="/messages" element={<RequireAuth roles={['admin','care_manager']}><AppLayout><AdminMessages /></AppLayout></RequireAuth>} />
            <Route path="/rcm" element={<RequireAuth roles={['admin']}><AppLayout><AdminRCM /></AppLayout></RequireAuth>} />
            <Route path="/funding" element={<RequireAuth roles={['admin']}><AppLayout><AdminFunding /></AppLayout></RequireAuth>} />
            <Route path="/attorney-portal" element={<RequireAuth roles={['attorney']}><AppLayout><AttorneyPortal /></AppLayout></RequireAuth>} />
            <Route path="/provider-portal" element={<RequireAuth roles={['provider']}><AppLayout><ProviderPortal /></AppLayout></RequireAuth>} />
            <Route path="/provider/rcm" element={<RequireAuth roles={['provider']}><AppLayout><ProviderRCM /></AppLayout></RequireAuth>} />

            {/* Patient portal */}
            <Route path="/patient/dashboard" element={<RequireAuth roles={['patient']}><AppLayout><PatientDashboard /></AppLayout></RequireAuth>} />

            {/* Funder portal placeholder */}
            <Route path="/funder/dashboard" element={<RequireAuth roles={['funder']}><AppLayout><FunderDashboardPlaceholder /></AppLayout></RequireAuth>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
