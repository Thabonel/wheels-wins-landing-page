import React, { useState } from "react";
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
  const [pamOpen, setPamOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b px-6 py-4">
        <Header />
      </header>

      {pathname === "/" && <Hero />}

      <main
        className={
          pathname === "/"
            ? "flex-1 px-0 py-0 bg-white"
            : "flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-1 bg-gray-50"
        }
      >
        {!["/", "/auth", "/onboarding"].includes(pathname) && <OfflineBanner />}
        <div className={pathname === "/" ? "w-full h-full" : "w-full h-full min-h-screen"}>
          {children}
        </div>
      </main>

      {/* Pam avatar chat trigger */}
      {!hidePam && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setPamOpen(true)}
            className="relative rounded-full border-4 border-blue-400 shadow-lg focus:outline-none"
            aria-label="Chat with Pam"
          >
            <img
              src="https://your-supabase-url/storage/v1/object/public/avatars/pam-avatar.png" // <-- REPLACE with your actual Pam avatar URL
              alt="Pam avatar"
              className="w-16 h-16 rounded-full"
            />
            {/* Online indicator */}
            <span className="absolute top-1 right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
          </button>
        </div>
      )}

      {/* Pam modal, React-state controlled */}
      {!hidePam && pamOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 flex items-end justify-center"
          onClick={() => setPamOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <img
                  src="https://your-supabase-url/storage/v1/object/public/avatars/pam-avatar.png" // <-- REPLACE here too!
                  alt="Pam avatar"
                  className="w-8 h-8 rounded-full"
                />
                Pam <span className="ml-2 text-green-500 text-xs font-normal">● online</span>
              </h3>
              <button
                onClick={() => setPamOpen(false)}
                className="text-gray-500"
                aria-label="Close Pam Chat"
              >
                Close
              </button>
            </div>
            <PamAssistantEnhanced userId={authUser?.id || ""} authToken={session?.access_token || ""} />
          </div>
        </div>
      )}

      <footer className="bg-white text-gray-600 py-4 border-t">
        <Footer />
      </footer>
    </div>
  );
}
