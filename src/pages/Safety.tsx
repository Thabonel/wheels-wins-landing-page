import { useEffect } from "react";
import { safetyTopics } from "@/components/safety/safetyData";
import SafetyFooter from "@/components/safety/SafetyFooter";
import SafetyTopicGrid from "@/components/safety/SafetyTopicGrid";
import SafetyTopicsList from "@/components/safety/SafetyTopicsList";

const Safety = () => {
  useEffect(() => {
    // Force scroll to top on page load
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Safety content layout */}
      <div className="flex flex-col gap-6">
        <SafetyTopicGrid topics={safetyTopics} />
        <div className="bg-white rounded-lg border p-4">
          <SafetyTopicsList topics={safetyTopics} />
        </div>
        <SafetyFooter />
      </div>
    </div>
  );
};

export default Safety;
