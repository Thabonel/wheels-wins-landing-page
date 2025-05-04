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

// Dummy visible placeholder for route registration
const Placeholder = ({ name }: { name: string }) => (
  <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
    <p>This is the <strong>{name}</strong> page placeholder.</p>
    <p>Replace this with real content.</p>
  </div>
);

// Query client for React Query
const queryClient = new QueryClient();

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isDevMode } = useAuth();
  return isAuthenticated || isDevMode ? <>{children}</> : <Navigate to="/" replace />;
};

// Handles conditional padding
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

          {/* Unprotected placeholder routes for Lovable canvas detection */}
          <Route path="/wheels" element={<Placeholder name="Wheels" />} />
          <Route path="/wins" element={<Placeholder name="Wins" />} />
          <Route path="/shop" element={<Placeholder name="Shop" />} />
          <Route path="/social" element={<Placeholder name="Social" />} />

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
