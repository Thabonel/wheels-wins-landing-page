import React, { Suspense } from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RegionProvider } from './context/RegionContext';
import { OfflineProvider } from './context/OfflineContext';
import { ExpensesProvider } from './context/ExpensesContext';
import { WheelsProvider } from './context/WheelsContext';
import Layout from './components/Layout';
import './i18n';
import { lazyWithRetry } from './utils/lazyWithRetry';
// Lazy load all page components for optimal bundle splitting with auto-retry on chunk errors
const Index = lazyWithRetry(() => import('./pages/Index'));
const Wheels = lazyWithRetry(() => import('./pages/Wheels'));
const Profile = lazyWithRetry(() => import('./pages/Profile'));
const Login = lazyWithRetry(() => import('./pages/Login'));
const Signup = lazyWithRetry(() => import('./pages/Signup'));
const Onboarding = lazyWithRetry(() => import('./pages/Onboarding'));
const You = lazyWithRetry(() => import('./pages/You'));
const Wins = lazyWithRetry(() => import('./pages/Wins'));
const Social = lazyWithRetry(() => import('./pages/Social'));
const Shop = lazyWithRetry(() => import('./pages/Shop'));
const AdminDashboard = lazyWithRetry(() => import('./pages/AdminDashboard'));
const KnowledgeCenter = lazyWithRetry(() => import('./pages/KnowledgeCenter'));
const KnowledgeArticle = lazyWithRetry(() => import('./pages/KnowledgeArticle'));
const KnowledgeSubmit = lazyWithRetry(() => import('./pages/KnowledgeSubmit'));
import ScrollToTop from './components/ScrollToTop';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
const PaymentSuccess = lazyWithRetry(() => import("@/pages/PaymentSuccess"));
const PaymentCanceled = lazyWithRetry(() => import("@/pages/PaymentCanceled"));
const CancelTrial = lazyWithRetry(() => import("@/pages/CancelTrial"));
const PasswordResetRequest = lazyWithRetry(() => import("@/pages/PasswordResetRequest"));
const UpdatePassword = lazyWithRetry(() => import("@/pages/UpdatePassword"));
const ThankYouDigistore24 = lazyWithRetry(() => import("@/pages/ThankYouDigistore24"));
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtection from './components/admin/AdminProtection';
// OLD PAM IMPORTS - COMMENTED OUT FOR REMOVAL
// import { LazyPamIntegrationProvider } from './components/pam/LazyPamIntegrationProvider';
// import { PamProvider } from './context/PamContext';
import { StagingBanner } from './components/StagingBanner';
import { logEnvironmentInfo } from './config/environment';
import { logEnvironmentStatus } from './config/env-validator';
import { AppErrorBoundary } from './components/common/ErrorBoundary';
import { PAMErrorBoundary } from './components/common/PAMErrorBoundary';
import { RouteMonitor } from './components/common/RouteMonitor';
import { LocationConsentManager } from './components/privacy/LocationConsentManager';
import { PamConnectionProvider } from '@/contexts/PamConnectionProvider';
import { PhotoSyncHandler } from './components/PhotoSyncHandler';
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'));
const CookiePolicy = lazyWithRetry(() => import('./pages/CookiePolicy'));
const AuthTest = lazyWithRetry(() => import('./pages/AuthTest'));
// Temporarily disabled - AI SDK not configured
// const PamAiSdkTest = lazyWithRetry(() => import('./pages/PamAiSdkTest'));
const PamVoiceTest = lazyWithRetry(() => import('./pages/PamVoiceTest'));
const PAMVoiceHybridTest = lazyWithRetry(() => import('./pages/PAMVoiceHybridTest'));
// const PamWebSocketTest = lazyWithRetry(() => import('./pages/PamWebSocketTest')); // Disabled - using unified PAM service
const PAMTestingPage = lazyWithRetry(() => import('./pages/PAMTestingPage'));
const PAMDevTestPage = lazyWithRetry(() => import('./pages/PAMDevTestPage'));
const PAMFallbackTestPage = lazyWithRetry(() => import('./dev/PAMFallbackTestPage'));
const PerformanceTestPage = lazyWithRetry(() => import('./dev/PerformanceTestPage'));
const SiteQALog = lazyWithRetry(() => import('./pages/SiteQALog'));
const FreshTripPlannerTest = lazyWithRetry(() => import('./pages/FreshTripPlannerTest'));
const WheelsSimple = lazyWithRetry(() => import('./pages/WheelsSimple'));
const PamDirectApiTest = lazyWithRetry(() => import('./pages/PamDirectApiTest'));
const Transition = lazyWithRetry(() => import('./pages/Transition'));
const Safety = lazyWithRetry(() => import('./pages/Safety'));


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
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <PhotoSyncHandler />
            <RegionProvider>
              <OfflineProvider>
                <ExpensesProvider>
                  <WheelsProvider>
                    {/* PamConnectionProvider: Keep for hooks but disable auto-connect */}
                    <PamConnectionProvider>
                      <LocationConsentManager />
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
                                  <Route path="/knowledge" element={<KnowledgeCenter />} />
                                  <Route path="/knowledge/:id" element={<KnowledgeArticle />} />
                                  <Route path="/knowledge/submit" element={<ProtectedRoute><KnowledgeSubmit /></ProtectedRoute>} />
                                  <Route path="/you" element={<ProtectedRoute><You /></ProtectedRoute>} />
                                  <Route path="/wins" element={<ProtectedRoute><Wins /></ProtectedRoute>} />
                                  <Route path="/social" element={<ProtectedRoute><Social /></ProtectedRoute>} />
                                  <Route path="/shop" element={<Shop />} />
                                  <Route path="/safety" element={<Safety />} />
                                  <Route path="/transition" element={<ProtectedRoute><Transition /></ProtectedRoute>} />
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
                                  <Route path="/auth-test" element={<ProtectedRoute><AuthTest /></ProtectedRoute>} />
                                  {/* <Route path="/pam-ai-sdk-test" element={<PamAiSdkTest />} /> */}
                                  <Route path="/pam-voice-test" element={<PamVoiceTest />} />
                                  <Route path="/pam-voice-hybrid-test" element={<ProtectedRoute><PAMVoiceHybridTest /></ProtectedRoute>} />
                                  {/* <Route path="/pam-websocket-test" element={<PamWebSocketTest />} /> */}
                                  <Route path="/pam-testing" element={<ProtectedRoute><PAMTestingPage /></ProtectedRoute>} />
                                  <Route path="/pam-dev-test" element={<PAMDevTestPage />} />
                                  <Route path="/pam-fallback-test" element={<PAMFallbackTestPage />} />
                                  <Route path="/performance-test" element={<PerformanceTestPage />} />
                                  <Route path="/qa" element={<SiteQALog />} />
                                  <Route path="/fresh-trip-planner" element={<FreshTripPlannerTest />} />
                                  <Route path="/wheels-simple" element={<WheelsSimple />} />
                                  <Route path="/pam-direct-api-test" element={<PamDirectApiTest />} />
                                  <Route path="*" element={<div className="container p-8 text-center"><h1 className="text-2xl font-bold mb-4">404 - Page Not Found</h1><p>The page you're looking for doesn't exist.</p></div>} />
                                </Routes>
                            </Suspense>
                          </div>
                          </Layout>
                    </PamConnectionProvider>
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
