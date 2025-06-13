// src/components/Layout.tsx
import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import MicButton from "@/components/MicButton";
import PamAssistant from "@/components/PamAssistant";
import { useAuth } from "@/context/AuthContext";
import { useLocation } from "react-router-dom";
import Header from "@/components/header/Header";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";
import OfflineBanner from "@/components/OfflineBanner";
import PamSidebar from "@/components/PamSidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const hidePam = ["/", "/auth", "/onboarding"].includes(pathname);
  const isWheelsPage = pathname === "/wheels";
  const { user: authUser } = useAuth();

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
            ? "flex-1 px-0 py-0" 
            : isWheelsPage
            ? "flex-1 h-full overflow-hidden"
            : "flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6"
        }
      >
        {/* Show offline banner on dashboard pages */}
        {!["/", "/auth", "/onboarding"].includes(pathname) && <OfflineBanner />}
        {children}
      </main>

      {/* Desktop Pam chat sidebar */}
      {!hidePam && !isMobile && (
        <PamSidebar />
      )}

      {/* Mobile Pam floating button - show on wheels page as talk bubble */}
      {!hidePam && isMobile && isWheelsPage && (
        <div className="fixed bottom-4 right-4 z-50">
          <button className="bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>
      )}

      <footer className="bg-white text-gray-600 py-4">
        <Footer />
      </footer>
    </div>
  );
}
