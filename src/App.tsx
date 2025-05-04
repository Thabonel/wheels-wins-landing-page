import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Header from "@/components/header/Header";
import Footer from "@/components/Footer";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import You from "./pages/You";
import Profile from "./pages/Profile";
import ScrollToTop from "@/components/ScrollToTop";

// Dummy components to force registration
const Dummy = () => <div style={{ display: 'none' }} />;

// Query client for React Query
const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isDevMode } = useAuth();
  if (isAuthenticated || isDevMode) return <>{children}</>;
  return <Navigate to="/" replace />;
};

const Main = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const isHome = location.pathname === "/";
  return (
    <main className={`flex-1 ${isHome ? "!pt-0" : "pt-24"}`}>
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
          <Route path="/you" element={<ProtectedRoute><You /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

          {/* Register hidden dummy elements to force canvas recognition */}
          <Route path="/wheels" element={<ProtectedRoute><Dummy /></ProtectedRoute>} />
          <Route path="/wins" element={<ProtectedRoute><Dummy /></ProtectedRoute>} />
          <Route path="/shop" element={<ProtectedRoute><Dummy /></ProtectedRoute>} />
          <Route path="/social" element={<ProtectedRoute><Dummy /></ProtectedRoute>} />

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
