// src/components/Layout.tsx
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import PamAssistant from '@/components/PamAssistant';
import { useLocation } from 'react-router-dom';
import Header from '@/components/header/Header';
import Footer from '@/components/Footer';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const hidePam = ['/', '/auth', '/onboarding'].includes(pathname);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <Header />
      </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      {/* Mobile Pam: floating button + modal */}
      {!hidePam && isMobile && (
        <>
          <button
            onClick={() => document.getElementById('pam-modal')?.classList.toggle('hidden')}
            className="fixed bottom-4 right-4 z-30 bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg"
          >
            <span className="text-lg font-bold">Pam</span>
          </button>

          <div id="pam-modal" className="hidden fixed inset-0 z-40 bg-black bg-opacity-50">
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Chat with Pam</h3>
                <button
                  onClick={() => document.getElementById('pam-modal')?.classList.add('hidden')}
                  className="text-gray-500"
                >
                  Close
                </button>
              </div>
              <PamAssistant user={{ name: "User" }} />
            </div>
          </div>
        </>
      )}

      <footer className="bg-gray-800 text-white py-4">
        <Footer />
      </footer>
    </div>
  );
}
