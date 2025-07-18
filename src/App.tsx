import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RegionProvider } from './context/RegionContext';
import { OfflineProvider } from './context/OfflineContext';
import { ExpensesProvider } from './context/ExpensesContext';
import { WheelsProvider } from './context/WheelsContext';
import Layout from './components/Layout';
import Index from './pages/Index';
import Wheels from './pages/Wheels';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import You from './pages/You';
import Wins from './pages/Wins';
import Social from './pages/Social';
import Shop from './pages/Shop';
import AdminDashboard from './pages/AdminDashboard';
import VideoEditor from './pages/VideoEditor';
import ScrollToTop from './components/ScrollToTop';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCanceled from "@/pages/PaymentCanceled";
import CancelTrial from "@/pages/CancelTrial";
import PasswordResetRequest from "@/pages/PasswordResetRequest";
import UpdatePassword from "@/pages/UpdatePassword";
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtection from './components/admin/AdminProtection';
import { PamIntegrationProvider } from './components/pam/PamIntegrationProvider';
import { StagingBanner } from './components/StagingBanner';
import { logEnvironmentInfo } from './config/environment';

const queryClient = new QueryClient();

function App() {
  // Log environment info in development/staging
  React.useEffect(() => {
    logEnvironmentInfo();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <StagingBanner />
        <Router>
          <AuthProvider>
            <RegionProvider>
              <OfflineProvider>
                <ExpensesProvider>
                  <WheelsProvider>
                    <PamIntegrationProvider>
                      <ScrollToTop />
                      <Layout>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/wheels" element={<ProtectedRoute><Wheels /></ProtectedRoute>} />
                        <Route path="/you" element={<ProtectedRoute><You /></ProtectedRoute>} />
                        <Route path="/wins" element={<ProtectedRoute><Wins /></ProtectedRoute>} />
                        <Route path="/social" element={<ProtectedRoute><Social /></ProtectedRoute>} />
                        <Route path="/shop" element={<Shop />} />
                        <Route path="/video-editor" element={<ProtectedRoute><VideoEditor /></ProtectedRoute>} />
                        <Route path="/admin" element={<AdminProtection><AdminDashboard /></AdminProtection>} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        <Route path="/payment-canceled" element={<PaymentCanceled />} />
                        <Route path="/cancel-trial" element={<CancelTrial />} />
                        <Route path="/reset-password" element={<PasswordResetRequest />} />
                        <Route path="/update-password" element={<UpdatePassword />} />
                        <Route path="/terms" element={<div className="container p-8"><h1 className="text-2xl font-bold mb-4">Terms of Service</h1><p>Terms of service content will be added here.</p></div>} />
                        <Route path="/privacy" element={<div className="container p-8"><h1 className="text-2xl font-bold mb-4">Privacy Policy</h1><p>Privacy policy content will be added here.</p></div>} />
                        <Route path="/cookies" element={<div className="container p-8"><h1 className="text-2xl font-bold mb-4">Cookie Policy</h1><p>Cookie policy content will be added here.</p></div>} />
                        <Route path="*" element={<div className="container p-8 text-center"><h1 className="text-2xl font-bold mb-4">404 - Page Not Found</h1><p>The page you're looking for doesn't exist.</p></div>} />
                      </Routes>
                      </Layout>
                    </PamIntegrationProvider>
                  </WheelsProvider>
                </ExpensesProvider>
              </OfflineProvider>
            </RegionProvider>
          </AuthProvider>
        </Router>
    </QueryClientProvider>
  );
}

export default App;