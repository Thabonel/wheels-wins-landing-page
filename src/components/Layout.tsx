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

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const isMobile = useIsMobile();
  const { pathname } = useLocation();
  const hidePam = ["/", "/auth", "/onboarding"].includes(pathname);
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
          pathname === "/" ? "flex-1 px-0 py-0" : "flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-6"
        }
      >
       {children}
      </main>

      {/* Desktop Pam chat sidebar */}
      {!hidePam && !isMobile && (
        <div className="fixed inset-y-[var(--header-height)] top-[var(--header-height)] right-8 w-72">
          <PamAssistant />
        </div>
      )}

      {/* Optional floating MicButton */}
      {/* {!hidePam && <MicButton />} */}

      <footer className="bg-white text-gray-600 py-4">
        <Footer />
      </footer>
    </div>
  );
}
