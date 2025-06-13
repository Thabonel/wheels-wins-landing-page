
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RegionProvider } from './context/RegionContext';
import { OfflineProvider } from './context/OfflineContext';
import { ExpensesProvider } from './context/ExpensesContext';
import Layout from './components/Layout';
import Index from './pages/Index';
import Wheels from './pages/Wheels';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import Onboarding from './pages/Onboarding';
import ScrollToTop from './components/ScrollToTop';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import PaymentSuccess from "@/pages/PaymentSuccess";
import PaymentCanceled from "@/pages/PaymentCanceled";

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
                <ScrollToTop />
                <Layout>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/wheels" element={<Wheels />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                    <Route path="/payment-canceled" element={<PaymentCanceled />} />
                  </Routes>
                </Layout>
              </ExpensesProvider>
            </OfflineProvider>
          </RegionProvider>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
