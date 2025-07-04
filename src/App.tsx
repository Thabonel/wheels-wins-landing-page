import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
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
import ScrollToTop from './components/ScrollToTop';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCanceled from "@/pages/PaymentCanceled";
import CancelTrial from "@/pages/CancelTrial";
import PasswordResetRequest from "@/pages/PasswordResetRequest";
import UpdatePassword from "@/pages/UpdatePassword";
import ProtectedRoute from './components/ProtectedRoute';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
        <Router>
          <AuthProvider>
            <RegionProvider>
              <OfflineProvider>
                <ExpensesProvider>
                  <WheelsProvider>
                    <ScrollToTop />
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/wheels" element={<ProtectedRoute><Wheels /></ProtectedRoute>} />
                        <Route path="/you" element={<ProtectedRoute><You /></ProtectedRoute>} />
                        <Route path="/wins" element={<ProtectedRoute><Wins /></ProtectedRoute>} />
                        <Route path="/social" element={<ProtectedRoute><Social /></ProtectedRoute>} />
                        <Route path="/shop" element={<Shop />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/onboarding" element={<Onboarding />} />
                        <Route path="/payment-success" element={<PaymentSuccess />} />
                        <Route path="/payment-canceled" element={<PaymentCanceled />} />
                        <Route path="/cancel-trial" element={<CancelTrial />} />
                        <Route path="/reset-password" element={<PasswordResetRequest />} />
                        <Route path="/update-password" element={<UpdatePassword />} />
                      </Routes>
                    </Layout>
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