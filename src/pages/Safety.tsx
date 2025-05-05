
import { useEffect } from "react";
import { safetyTopics } from "@/components/safety/safetyData";
import SafetyFooter from "@/components/safety/SafetyFooter";
import SafetyTopicGrid from "@/components/safety/SafetyTopicGrid";
import SafetyTopicsList from "@/components/safety/SafetyTopicsList";
import PamAssistantWrapper from "@/components/shop/PamAssistantWrapper";

const Safety = () => {
  // Mock user data for Pam assistant
  const user = {
    name: "John",
    avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//avatar-placeholder.png"
  };

  // Force scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Two-column layout with responsive design */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Content (75% on desktop) */}
        <div className="w-full lg:w-3/4">
          {/* Topic selection cards in a grid layout */}
          <SafetyTopicGrid topics={safetyTopics} />

          {/* Detailed content sections */}
          <div className="bg-white rounded-lg border p-4">
            <SafetyTopicsList topics={safetyTopics} />
          </div>

          <SafetyFooter />
        </div>
        
        {/* Right Column - Pam Assistant (25% on desktop) */}
        <div className={`w-full lg:w-1/4 mt-6 lg:mt-0`}>
          <PamAssistantWrapper user={user} />
        </div>
      </div>
    </div>
  );
};

export default Safety;
