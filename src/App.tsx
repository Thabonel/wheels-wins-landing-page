import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Header from "@/components/header/Header";
import Footer from "@/components/Footer";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import You from "./pages/You";
import Profile from "./pages/Profile";
import ScrollToTop from "@/components/ScrollToTop";
import Wheels from "./pages/Wheels";
import Wins from "./pages/Wins";
import { ExpensesProvider } from "@/context/ExpensesContext";
import Shop from "./pages/Shop";
import Social from "./pages/Social";
import Auth from "./pages/Auth";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentCanceled from "./pages/PaymentCanceled";
import Safety from "./pages/Safety";
import AdminDashboard from "./pages/AdminDashboard";
import PamChatController from "@/components/pam/PamChatController";
import Onboarding from "./pages/Onboarding";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isDevMode } = useAuth();
  return isAuthenticated || isDevMode ? <>{children}</> : <Navigate to="/auth" replace />;
};

const Main = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const isAuth = location.pathname === "/auth";

  return (
    <main className="flex-1 pt-[var(--header-height)]">
      {children}
    </main>
  );
};

function AppRoutes() {
  const { pathname } = useLocation();
  const excludePam = pathname === "/" || pathname === "/profile";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <div className="flex w-full px-4 sm:px-6 lg:px-8 py-6 gap-6">
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
            <Route path="/you" element={<Main><ProtectedRoute><You /></ProtectedRoute></Main>} />
            <Route path="/you/safety" element={<ProtectedRoute><Safety /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/wheels" element={<Wheels />} />
            <Route path="/safety" element={<Main><Navigate to="/you/safety" replace /></Main>} />
            <Route path="/wins" element={<ExpensesProvider><Wins /></ExpensesProvider>} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/social" element={<Social />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>

        {!excludePam && (
          <div className="hidden lg:block fixed right-0 top-0 h-full w-[300px]">
            <PamChatController />
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <AppRoutes />
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
