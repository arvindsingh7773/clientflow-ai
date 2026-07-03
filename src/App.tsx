/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SEO } from './components/SEO';
import { Loader2 } from 'lucide-react';

// Lazy loaded page components
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const AuthLayout = lazy(() => import('./pages/auth/AuthLayout').then(m => ({ default: m.AuthLayout })));
const Login = lazy(() => import('./pages/auth/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./pages/auth/Signup').then(m => ({ default: m.Signup })));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const PhoneLogin = lazy(() => import('./pages/auth/PhoneLogin').then(m => ({ default: m.PhoneLogin })));
const RoleSelection = lazy(() => import('./pages/auth/RoleSelection').then(m => ({ default: m.RoleSelection })));
const DashboardHome = lazy(() => import('./pages/dashboard/DashboardHome').then(m => ({ default: m.DashboardHome })));
const ClientDashboard = lazy(() => import('./pages/dashboard/client/ClientDashboard').then(m => ({ default: m.ClientDashboard })));
const CreateProject = lazy(() => import('./pages/dashboard/client/CreateProject').then(m => ({ default: m.CreateProject })));
const ProjectsList = lazy(() => import('./pages/dashboard/client/ProjectsList').then(m => ({ default: m.ProjectsList })));
const ProjectDetails = lazy(() => import('./pages/dashboard/client/ProjectDetails').then(m => ({ default: m.ProjectDetails })));
const FreelancerDashboard = lazy(() => import('./pages/dashboard/freelancer/FreelancerDashboard').then(m => ({ default: m.FreelancerDashboard })));
const BrowseProjects = lazy(() => import('./pages/dashboard/freelancer/BrowseProjects').then(m => ({ default: m.BrowseProjects })));
const ProjectApply = lazy(() => import('./pages/dashboard/freelancer/ProjectApply').then(m => ({ default: m.ProjectApply })));
const MyProposals = lazy(() => import('./pages/dashboard/freelancer/MyProposals').then(m => ({ default: m.MyProposals })));
const ProfileManager = lazy(() => import('./pages/dashboard/freelancer/ProfileManager').then(m => ({ default: m.ProfileManager })));
const PublicProfile = lazy(() => import('./pages/dashboard/freelancer/PublicProfile').then(m => ({ default: m.PublicProfile })));
const SearchPage = lazy(() => import('./pages/dashboard/Search').then(m => ({ default: m.SearchPage })));
const Messages = lazy(() => import('./pages/dashboard/Messages').then(m => ({ default: m.Messages })));
const Wallet = lazy(() => import('./pages/dashboard/Wallet'));
const MarketplaceHome = lazy(() => import('./pages/dashboard/business_marketplace/MarketplaceHome'));
const AdminDashboard = lazy(() => import('./pages/dashboard/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

// Dynamic loading spinner fallback
function PageLoader() {
  return (
    <div className="flex-grow min-h-[60vh] flex flex-col items-center justify-center p-8 bg-slate-950 text-white" id="lazy-page-loader">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      <span className="mt-4 text-sm font-medium text-slate-400">Loading ClientFlow modules...</span>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <SEO title="Next-Gen AI Marketplace" />
        <div className="flex flex-col min-h-screen bg-background text-foreground">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Auth Routes */}
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/phone-login" element={<PhoneLogin />} />
              </Route>
              
              {/* Main App Routes with Navbar/Footer */}
              <Route path="/" element={
                <>
                  <Navbar />
                  <main className="flex-grow">
                    <LandingPage />
                  </main>
                  <Footer />
                </>
              } />
              
              {/* Public Profile Route */}
              <Route path="/freelancer/:id" element={<PublicProfile />} />
              
              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/role-selection" element={<RoleSelection />} />
              </Route>

              {/* Dashboard Routes - Protected & uses DashboardLayout without main Navbar/Footer */}
              <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<DashboardHome />} />
                
                {/* Client Routes */}
                <Route path="/dashboard/projects" element={<ProjectsList />} />
                <Route path="/dashboard/projects/new" element={<CreateProject />} />
                <Route path="/dashboard/projects/:id" element={<ProjectDetails />} />
                
                {/* Freelancer Routes */}
                <Route path="/dashboard/freelancer/browse" element={<BrowseProjects />} />
                <Route path="/dashboard/freelancer/projects/:id" element={<ProjectApply />} />
                <Route path="/dashboard/freelancer/proposals" element={<MyProposals />} />
                <Route path="/dashboard/freelancer/profile" element={<ProfileManager />} />

                {/* Shared Routes */}
                <Route path="/dashboard/search" element={<SearchPage />} />
                <Route path="/dashboard/marketplace" element={<MarketplaceHome />} />
                <Route path="/dashboard/messages" element={<Messages />} />
                <Route path="/dashboard/wallet" element={<Wallet />} />
                <Route path="/dashboard/admin" element={<AdminDashboard />} />
                <Route path="/dashboard/settings" element={<div className="p-8 font-semibold text-slate-400">Settings (Coming Soon)</div>} />
              </Route>

              {/* Fallback 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  );
}


