
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import You from '@/pages/You';
import Wheels from '@/pages/Wheels';
import Wins from '@/pages/Wins';
import Social from '@/pages/Social';
import Shop from '@/pages/Shop';
import Profile from '@/pages/Profile';
import Settings from '@/pages/Settings';
import Admin from '@/pages/Admin';
import LearningDashboard from '@/components/admin/LearningDashboard';
import { AuthProvider } from '@/context/AuthContext';
import { RegionProvider } from '@/context/RegionContext';
import { WheelsProvider } from '@/context/WheelsContext';
import { OfflineProvider } from '@/context/OfflineContext';
import PamChatController from '@/components/pam/PamChatController';
import { VoiceProvider } from '@/context/VoiceContext';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <AuthProvider>
        <RegionProvider>
          <WheelsProvider>
            <OfflineProvider>
              <VoiceProvider>
                <BrowserRouter>
                  <div className="min-h-screen bg-gray-50">
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/you" element={<You />} />
                        <Route path="/wheels" element={<Wheels />} />
                        <Route path="/wins" element={<Wins />} />
                        <Route path="/social" element={<Social />} />
                        <Route path="/shop" element={<Shop />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/admin" element={<Admin />} />
                        <Route path="/admin/learning" element={<LearningDashboard />} />
                      </Routes>
                    </Layout>
                    <PamChatController />
                  </div>
                </BrowserRouter>
              </VoiceProvider>
            </OfflineProvider>
          </WheelsProvider>
        </RegionProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
