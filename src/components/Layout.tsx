import React, { useState } from "react";
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
              src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp"
              alt="Pam avatar"
              className="w-16 h-16 rounded-full object-cover"
            />
            {/* Online indicator */}
            <span className="absolute top-1 right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></span>
          </button>
        </div>
      )}

      {/* Pam modal, React-state controlled */}
          </div>
        </div>
      )}

      <footer className="bg-white text-gray-600 py-4 border-t">
        <Footer />
      </footer>
    </div>
  );
}
