import { useEffect } from "react";
import { Link } from "react-router-dom";
import { safetyTopics } from "@/components/safety/safetyData";
import SafetyFooter from "@/components/safety/SafetyFooter";
import SafetyTopicGrid from "@/components/safety/SafetyTopicGrid";
import SafetyTopicsList from "@/components/safety/SafetyTopicsList";
import PamAssistant from "@/components/PamAssistant";
import { useIsMobile } from "@/hooks/use-mobile";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

const Safety = () => {
  const isMobile = useIsMobile();

  const user = {
    name: "John",
    avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//avatar-placeholder.png"
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Breadcrumb for navigation context */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/"><Home className="h-4 w-4" /></Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/wheels">Wheels</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Safety Guide</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Two-column layout with responsive design */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Content */}
        <div className="w-full lg:w-3/4">
          <SafetyTopicGrid topics={safetyTopics} />

          <div className="bg-white rounded-lg border p-4">
            <SafetyTopicsList topics={safetyTopics} />
          </div>

          <SafetyFooter />
        </div>

        {/* Right Column - Pam Assistant */}
        <div className={`${isMobile ? 'fixed bottom-4 right-4 z-30' : 'w-full lg:w-1/4 mt-6 lg:mt-0'}`}>
          {isMobile ? (
            <>
              <button
                onClick={() => document.getElementById('pam-modal')?.classList.toggle('hidden')}
                className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg"
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
                  <PamAssistant user={user} />
                </div>
              </div>
            </>
          ) : (
            <PamAssistant user={user} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Safety;
