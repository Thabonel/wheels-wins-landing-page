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
              <h3 className="text-xl font-bold">Chat with Pam</h3>
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
