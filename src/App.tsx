
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { RegionProvider } from "@/context/RegionContext";
import { ExpensesProvider } from "@/context/ExpensesContext";
import Header from "@/components/header/Header";
import Footer from "@/components/Footer";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import You from "./pages/You";
import Profile from "./pages/Profile";
import ScrollToTop from "@/components/ScrollToTop";
import Wheels from "./pages/Wheels";
import Wins from "./pages/Wins";
import Shop from "./pages/Shop";
import Social from "./pages/Social";
import Auth from "./pages/Auth";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Safety from "./pages/Safety";

// Query client for React Query
const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isDevMode } = useAuth();
  return isAuthenticated || isDevMode ? <>{children}</> : <Navigate to="/auth" replace />;
};

// Handles conditional padding
const Main = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isAuth = location.pathname === "/auth";
  return (
    <main className={`flex-1 ${isHome ? "!pt-0" : isAuth ? "" : "pt-24"}`}>
      {children}
    </main>
  );
};

function AppRoutes() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Main>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/you" element={<ProtectedRoute><You /></ProtectedRoute>} />
          <Route path="/you/safety" element={<ProtectedRoute><Safety /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/wheels" element={<Wheels />} />
          {/* Redirect old safety path to the new location */}
          <Route path="/safety" element={<Navigate to="/you/safety" replace />} />
          <Route path="/wins" element={
            <ExpensesProvider>
              <Wins />
            </ExpensesProvider>
          } />
          <Route path="/shop" element={<Shop />} />
          <Route path="/social" element={<Social />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-canceled" element={<PaymentCanceled />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RegionProvider>
          <Router>
            <ScrollToTop />
            <AppRoutes />
          </Router>
          <Toaster />
        </RegionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
