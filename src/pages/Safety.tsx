
import { safetyTopics } from "@/components/safety/safetyData";
import SafetyHeader from "@/components/safety/SafetyHeader";
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Two-column layout with responsive design */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column - Content (75% on desktop) */}
        <div className="w-full lg:w-3/4">
          <SafetyHeader />
          
          {/* Topic selection cards in a grid layout */}
          <SafetyTopicGrid topics={safetyTopics} />

          {/* Detailed content sections */}
          <SafetyTopicsList topics={safetyTopics} />

          <SafetyFooter />
        </div>
        
        {/* Right Column - Pam Assistant (25% on desktop) */}
        <div className="w-full lg:w-1/4 mt-6 lg:mt-0">
          <PamAssistantWrapper user={user} />
        </div>
      </div>
    </div>
  );
};

export default Safety;
