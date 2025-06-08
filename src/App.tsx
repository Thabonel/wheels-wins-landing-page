// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { OfflineProvider } from "@/context/OfflineContext";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import You from "./pages/You";
import Profile from "./pages/Profile";
import Wheels from "./pages/Wheels";
import Wins from "./pages/Wins";
import Shop from "./pages/Shop";
import Social from "./pages/Social";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Safety from "./pages/Safety";
import AdminDashboard from "./pages/AdminDashboard";
import ScrollToTop from "@/components/ScrollToTop";
import { ExpensesProvider } from "@/context/ExpensesContext";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isDevMode } = useAuth();
  return isAuthenticated || isDevMode ? <>{children}</> : <Navigate to="/auth" replace />;
};

function AppRoutes() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith('/admin');

  // Admin routes get their own layout
  if (isAdminRoute) {
    return (
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  // All other routes use the main layout
  return (
    <Layout>
      <div className="flex w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route
              path="/you"
              element={
                <ProtectedRoute>
                  <You />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route path="/wheels" element={<Wheels />} />
            <Route
              path="/wins"
              element={
                <ExpensesProvider>
                  <Wins />
                </ExpensesProvider>
              }
            />
            <Route path="/shop" element={<Shop />} />
            <Route path="/social" element={<Social />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route
              path="/safety"
              element={
                <ProtectedRoute>
                  <Safety />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OfflineProvider>
          <Router>
            <ScrollToTop />
            <AppRoutes />
          </Router>
        </OfflineProvider>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}