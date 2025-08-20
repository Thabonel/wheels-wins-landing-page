import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RegionProvider } from './context/RegionContext';
import { OfflineProvider } from './context/OfflineContext';
import { ExpensesProvider } from './context/ExpensesContext';
import { WheelsProvider } from './context/WheelsContext';
import Layout from './components/Layout';
// Lazy load all page components for optimal bundle splitting
const Index = lazy(() => import('./pages/Index'));
const Wheels = lazy(() => import('./pages/Wheels'));
const Profile = lazy(() => import('./pages/Profile'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const You = lazy(() => import('./pages/You'));
const Wins = lazy(() => import('./pages/Wins'));
const Social = lazy(() => import('./pages/Social'));
const Shop = lazy(() => import('./pages/Shop'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
import ScrollToTop from './components/ScrollToTop';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
const PaymentSuccess = lazy(() => import("@/pages/PaymentSuccess"));
const PaymentCanceled = lazy(() => import("@/pages/PaymentCanceled"));
const CancelTrial = lazy(() => import("@/pages/CancelTrial"));
const PasswordResetRequest = lazy(() => import("@/pages/PasswordResetRequest"));
const UpdatePassword = lazy(() => import("@/pages/UpdatePassword"));
const ThankYouDigistore24 = lazy(() => import("@/pages/ThankYouDigistore24"));
const Trips = lazy(() => import("@/pages/Trips"));
const TripsPublic = lazy(() => import("@/pages/TripsPublic"));
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtection from './components/admin/AdminProtection';
import { LazyPamIntegrationProvider } from './components/pam/LazyPamIntegrationProvider';
import { PamProvider } from './context/PamContext';
import { StagingBanner } from './components/StagingBanner';
import { logEnvironmentInfo } from './config/environment';
import { logEnvironmentStatus } from './config/env-validator';
import { AppErrorBoundary } from './components/common/ErrorBoundary';
import { PAMErrorBoundary } from './components/common/PAMErrorBoundary';
import { RouteMonitor } from './components/common/RouteMonitor';
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy'));
// Temporarily disabled - AI SDK not configured
// const PamAiSdkTest = lazy(() => import('./pages/PamAiSdkTest'));
const PamVoiceTest = lazy(() => import('./pages/PamVoiceTest'));
const PamWebSocketTest = lazy(() => import('./pages/PamWebSocketTest'));
const SiteQALog = lazy(() => import('./pages/SiteQALog'));


const queryClient = new QueryClient();

function App() {
  // Log environment info in development/staging
  React.useEffect(() => {
    logEnvironmentInfo();
    logEnvironmentStatus();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <Toaster />
        <StagingBanner />
        <Router>
          <AuthProvider>
            <RegionProvider>
              <OfflineProvider>
                <ExpensesProvider>
                  <WheelsProvider>
                    <PamProvider>
                      <LazyPamIntegrationProvider>
                        <ScrollToTop />
                        <RouteMonitor />
                        <Layout>
                        <div className="route-container">
                          <Suspense fallback={
                            <div className="flex items-center justify-center h-64 space-x-2">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <span className="text-gray-600">Loading page...</span>
                            </div>
                          }>
                              <Routes>
                                <Route path="/" element={<Index />} />
                                <Route path="/wheels" element={<ProtectedRoute><Wheels /></ProtectedRoute>} />
                                <Route path="/trips" element={<ProtectedRoute><Trips /></ProtectedRoute>} />
                                <Route path="/trips-public" element={<TripsPublic />} />
                                <Route path="/you" element={<ProtectedRoute><You /></ProtectedRoute>} />
                                <Route path="/wins" element={<ProtectedRoute><Wins /></ProtectedRoute>} />
                                <Route path="/social" element={<ProtectedRoute><Social /></ProtectedRoute>} />
                                <Route path="/shop" element={<Shop />} />
                                <Route path="/admin" element={
                                  <AdminProtection>
                                    <AdminDashboard />
                                  </AdminProtection>
                                } />
                                <Route path="/profile" element={<Profile />} />
                                <Route path="/login" element={<Login />} />
                                <Route path="/signup" element={<Signup />} />
                                <Route path="/onboarding" element={<Onboarding />} />
                                <Route path="/payment-success" element={<PaymentSuccess />} />
                                <Route path="/payment-canceled" element={<PaymentCanceled />} />
                                <Route path="/cancel-trial" element={<CancelTrial />} />
                                <Route path="/reset-password" element={<PasswordResetRequest />} />
                                <Route path="/update-password" element={<UpdatePassword />} />
                                <Route path="/thank-you/digistore24" element={<ThankYouDigistore24 />} />
                                <Route path="/terms" element={<TermsOfService />} />
                                <Route path="/privacy" element={<PrivacyPolicy />} />
                                <Route path="/cookies" element={<CookiePolicy />} />
                                {/* <Route path="/pam-ai-sdk-test" element={<PamAiSdkTest />} /> */}
                                <Route path="/pam-voice-test" element={<PamVoiceTest />} />
                                <Route path="/pam-websocket-test" element={<PamWebSocketTest />} />
                                <Route path="/qa" element={<SiteQALog />} />
                                <Route path="*" element={<div className="container p-8 text-center"><h1 className="text-2xl font-bold mb-4">404 - Page Not Found</h1><p>The page you're looking for doesn't exist.</p></div>} />
                              </Routes>
                          </Suspense>
                        </div>
                      </Layout>
                      </LazyPamIntegrationProvider>
                    </PamProvider>
                  </WheelsProvider>
                </ExpensesProvider>
              </OfflineProvider>
            </RegionProvider>
          </AuthProvider>
        </Router>
        
      </AppErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;