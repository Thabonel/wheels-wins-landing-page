
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { RegionProvider } from "./context/RegionContext";
import { OfflineProvider } from "./context/OfflineContext";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import Wheels from "./pages/Wheels";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RegionProvider>
          <OfflineProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/wheels" element={<Wheels />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </OfflineProvider>
        </RegionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
