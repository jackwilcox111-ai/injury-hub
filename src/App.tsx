import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SessionTimeoutProvider } from "@/components/global/SessionTimeoutProvider";
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
import AttorneyMarketplace from "./pages/AttorneyMarketplace";
import ProviderPortal from "./pages/ProviderPortal";

import ReportingDashboard from "./pages/ReportingDashboard";
import TaskDashboard from "./pages/TaskDashboard";
import PatientDashboard from "./pages/PatientDashboard";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/network/LandingPage";
import PatientIntake from "./pages/network/PatientIntake";
import ProviderJoin from "./pages/network/ProviderJoin";
import AttorneyJoin from "./pages/network/AttorneyJoin";
import FunderJoin from "./pages/network/FunderJoin";

import AdminDemandLetters from "./pages/AdminDemandLetters";
import AdminRecordsBills from "./pages/AdminRecordsBills";
import AdminMessages from "./pages/AdminMessages";
import FunderDashboard from "./pages/FunderDashboard";
import ProviderRCM from "./pages/ProviderRCM";
import PatientTimeline from "./pages/PatientTimeline";
import PatientMedicalTeam from "./pages/PatientMedicalTeam";
import PatientMessages from "./pages/PatientMessages";
import ProviderMessages from "./pages/ProviderMessages";
import FindProvider from "./pages/network/FindProvider";
import DemoPage from "./pages/network/DemoPage";
import ResourcesPage from "./pages/network/ResourcesPage";
import ResourceDetail from "./pages/network/ResourceDetail";
import ReferralAccept from "./pages/network/ReferralAccept";
import { ReactNode } from "react";

const queryClient = new QueryClient();

function RequireAuth({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { session, profile, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-mono text-sm">Loading...</p></div>;
  if (!session) return <Navigate to="/login" replace />;
  if (roles && profile && !roles.includes(profile.role)) {
    if (profile.role === 'attorney') return <Navigate to="/dashboard" replace />;
    if (profile.role === 'provider') return <Navigate to="/provider/dashboard" replace />;
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
  if (profile?.role === 'attorney') return <Navigate to="/dashboard" replace />;
  if (profile?.role === 'provider') return <Navigate to="/provider/dashboard" replace />;
  if (profile?.role === 'patient') return <Navigate to="/patient/dashboard" replace />;
  if (profile?.role === 'funder') return <Navigate to="/funder/dashboard" replace />;
  
  return <Navigate to="/dashboard" replace />;
}


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SessionTimeoutProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/get-started" element={<PatientIntake />} />
            <Route path="/provider/join" element={<ProviderJoin />} />
            <Route path="/attorney/join" element={<AttorneyJoin />} />
            <Route path="/funder/join" element={<FunderJoin />} />
            
            <Route path="/login" element={<Login />} />
            <Route path="/find-providers" element={<FindProvider />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/resources/:slug" element={<ResourceDetail />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/referral/accept" element={<ReferralAccept />} />

            {/* Admin / Care Manager / Attorney portal routes */}
            <Route path="/home" element={<AuthRedirect />} />
            <Route path="/dashboard" element={<RequireAuth roles={['admin','care_manager','attorney']}><AppLayout><Dashboard /></AppLayout></RequireAuth>} />
            <Route path="/cases" element={<RequireAuth roles={['admin','care_manager','attorney']}><AppLayout><CasesList /></AppLayout></RequireAuth>} />
            <Route path="/cases/:id" element={<RequireAuth roles={['admin','care_manager','attorney','provider']}><AppLayout><CaseDetail /></AppLayout></RequireAuth>} />
            <Route path="/providers" element={<RequireAuth roles={['admin','care_manager','attorney']}><AppLayout><ProvidersPage /></AppLayout></RequireAuth>} />
            <Route path="/attorneys" element={<RequireAuth roles={['admin']}><AppLayout><AttorneysPage /></AppLayout></RequireAuth>} />
            <Route path="/liens" element={<RequireAuth roles={['admin']}><AppLayout><LiensPage /></AppLayout></RequireAuth>} />
            <Route path="/calendar" element={<RequireAuth><AppLayout><CalendarPage /></AppLayout></RequireAuth>} />
            <Route path="/reports" element={<RequireAuth roles={['admin']}><AppLayout><ReportingDashboard /></AppLayout></RequireAuth>} />
            <Route path="/tasks" element={<RequireAuth roles={['admin','care_manager','attorney']}><AppLayout><TaskDashboard /></AppLayout></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth roles={['admin']}><AppLayout><SettingsPage /></AppLayout></RequireAuth>} />
            <Route path="/demand-letters" element={<RequireAuth roles={['admin','care_manager','attorney']}><AppLayout><AdminDemandLetters /></AppLayout></RequireAuth>} />
            <Route path="/messages" element={<RequireAuth roles={['admin','care_manager','attorney']}><AppLayout><AdminMessages /></AppLayout></RequireAuth>} />
            <Route path="/records-bills" element={<RequireAuth roles={['admin','care_manager']}><AppLayout><AdminRecordsBills /></AppLayout></RequireAuth>} />

            {/* Attorney extras */}
            <Route path="/attorney-portal" element={<Navigate to="/dashboard" replace />} />
            <Route path="/provider-portal" element={<Navigate to="/provider/dashboard" replace />} />
            <Route path="/attorney/marketplace" element={<RequireAuth roles={['attorney']}><AppLayout><AttorneyMarketplace /></AppLayout></RequireAuth>} />

            {/* Provider portal */}
            <Route path="/provider/dashboard" element={<RequireAuth roles={['provider']}><AppLayout><ProviderPortal /></AppLayout></RequireAuth>} />
            <Route path="/provider/rcm" element={<RequireAuth roles={['provider']}><AppLayout><ProviderRCM /></AppLayout></RequireAuth>} />
            <Route path="/provider/messages" element={<RequireAuth roles={['provider']}><AppLayout><ProviderMessages /></AppLayout></RequireAuth>} />

            {/* Patient portal */}
            <Route path="/patient/dashboard" element={<RequireAuth roles={['patient']}><AppLayout><PatientDashboard /></AppLayout></RequireAuth>} />
            <Route path="/patient/timeline" element={<RequireAuth roles={['patient']}><AppLayout><PatientTimeline /></AppLayout></RequireAuth>} />
            <Route path="/patient/messages" element={<RequireAuth roles={['patient']}><AppLayout><PatientMessages /></AppLayout></RequireAuth>} />

            {/* Funder portal */}
            <Route path="/funder/dashboard" element={<RequireAuth roles={['funder']}><AppLayout><FunderDashboard /></AppLayout></RequireAuth>} />


            <Route path="*" element={<NotFound />} />
          </Routes>
          </SessionTimeoutProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;