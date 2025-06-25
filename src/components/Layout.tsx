import React, { useState } from "react";
import PamAssistantEnhanced from "./PamAssistantEnhanced";
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
--
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <img
                  src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp"
                  alt="Pam avatar"
                  className="w-8 h-8 rounded-full object-cover"
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