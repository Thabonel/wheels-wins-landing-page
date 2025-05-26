// src/pages/You.tsx
import "@/components/you/calendar-styles.css";
import { useIsMobile } from "@/hooks/use-mobile";
import PamAssistant from "@/components/PamAssistant";
import UserCalendar from "@/components/UserCalendar";
import DashboardCards from "@/components/DashboardCards";
import WidgetArea from "@/components/WidgetArea";

const You = () => {
  const user = {
    name: "John",
    avatar:
      "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//avatar-placeholder.png",
  };
  const isMobile = useIsMobile();

  return (
    <>
      {/* Main content */}
      <main className="container px-4 sm:px-6 lg:px-8 py-6">
        {/* Adjusted for Pam sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - 75% on desktop */}
          <div className="w-full lg:w-3/4">
            <UserCalendar />
            <DashboardCards />
            <WidgetArea />
          </div>
        </div>
      </main>

      {/* Mobile Pam button */}
      {isMobile && (
        <>
          <button
            onClick={() =>
              document.getElementById("pam-modal")?.classList.toggle("hidden")
            }
            className="fixed bottom-4 right-4 z-30 bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg"
          >
            <span className="text-lg font-bold">Pam</span>
          </button>

          {/* Mobile Pam modal */}
          <div
            id="pam-modal"
            className="hidden fixed inset-0 z-40 bg-black bg-opacity-50"
          >
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Chat with Pam</h3>
                <button
                  onClick={() =>
                    document.getElementById("pam-modal")?.classList.add("hidden")
                  }
                  className="text-gray-500"
                >
                  Close
                </button>
              </div>
              <PamAssistant user={user} />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default You;
