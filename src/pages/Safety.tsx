
import { useEffect } from "react";
import { safetyTopics } from "@/components/safety/safetyData";
import SafetyTopicsList from "@/components/safety/SafetyTopicsList";

const Safety = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="container p-6"> {/* Pam sidebar is visible on this page */}
      {/* Page Intro */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Caravan Safety Guide</h1>
        <p className="text-gray-700 text-lg">
          Learn how to safely balance, hitch, reverse, and maintain your caravan setup. 
          Each section includes helpful advice and a step-by-step video walkthrough.
        </p>
      </div>

      {/* Content Sections */}
      <div className="bg-white rounded-lg border p-4">
        <SafetyTopicsList topics={safetyTopics} />
      </div>
    </div>
  );
};

export default Safety;
