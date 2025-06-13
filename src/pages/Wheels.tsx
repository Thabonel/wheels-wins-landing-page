import { useIsMobile } from "@/hooks/use-mobile";
import PamAssistant from "@/components/PamAssistant";
import TripPlanner from "@/components/wheels/TripPlanner";

const Wheels = () => {
  const isMobile = useIsMobile();

  return (
    <>
      {/* Main content */}
      <main className="container px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column - Trip Planner - 75% on desktop */}
          <div className="w-full lg:w-3/4">
            <TripPlanner />
          </div>
          
          {/* Right Column - Pam Assistant - 25% on desktop */}
          <div className="w-full lg:w-1/4">
            <div className="bg-white rounded-lg border p-4 h-fit">
              <PamAssistant />
            </div>
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
              <PamAssistant />
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default Wheels;