import React from "react";
import PamAssistantEnhanced from "@/components/PamAssistantEnhanced";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "react-router-dom";
import Header from "@/components/header/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import OfflineBanner from "@/components/OfflineBanner";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation();
  const hidePam = ["/", "/auth", "/onboarding"].includes(pathname);
  const { user: authUser, session } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <Header />
      </header>

      {/* Full-width hero only on homepage */}
      {pathname === "/" && <Hero />}

      <main
        className={
          pathname === "/"
            ? "flex-1 px-0 py-0 bg-white"
            : "flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-1 bg-gray-50"
        }
      >
        {/* Show offline banner on dashboard pages */}
        {!["/", "/auth", "/onboarding"].includes(pathname) && <OfflineBanner />}
        <div className={pathname === "/" ? "w-full h-full" : "w-full h-full min-h-screen"}>
          {children}
        </div>
      </main>

      {/* Pam floating button and modal—shown everywhere except excluded pages */}
      {!hidePam && (
        <>
          <div className="fixed bottom-20 right-4 z-50">
            <button
              onClick={() => document.getElementById('pam-modal')?.classList.toggle('hidden')}
              className="bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-colors"
              aria-label="Chat with Pam"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          </div>

          {/* Universal Pam modal */}
          <div id="pam-modal" className="hidden fixed inset-0 z-40 bg-black bg-opacity-50">
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Chat with Pam</h3>
                <button
                  onClick={() => document.getElementById('pam-modal')?.classList.add('hidden')}
                  className="text-gray-500"
                  aria-label="Close Pam Chat"
                >
                  Close
                </button>
              </div>
              <PamAssistantEnhanced userId={authUser?.id || ""} authToken={session?.access_token || ""} />
            </div>
          </div>
        </>
      )}

      <footer className="bg-white text-gray-600 py-4 border-t">
        <Footer />
      </footer>
    </div>
  );
}
