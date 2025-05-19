import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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
import PamChatController from "@/components/pam/PamChatController"; // ✅ Add Pam

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
  const { pathname } = useLocation(); // ✅ Required for conditional rendering
  const excludePam = pathname === "/" || pathname === "/profile";

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <div className="flex flex-1"> {/* Added flex container for main and sidebar */}
        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/you" element={<ProtectedRoute><You /></ProtectedRoute>} />
            <Route path="/you/safety" element={<ProtectedRoute><Safety /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/wheels" element={<Wheels />} />
            <Route path="/safety" element={<Main><Navigate to="/you/safety" replace /></Main>} />
            <Route path="/wins" element={<ExpensesProvider><Wins /></ExpensesProvider>} /> {/* This route is now outside of the Main component */}
            <Route path="/shop" element={<Shop />} />
            <Route path="/social" element={<Social />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="/payment-canceled" element={<PaymentCanceled />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>

        {/* Pam Sidebar on Desktop (exclude home + profile) */}
        {!excludePam && (
          <div className="hidden md:block w-[340px] max-w-[340px] border-l bg-white shadow-lg z-50">
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
