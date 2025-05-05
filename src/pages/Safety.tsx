import { useEffect } from "react";
import { safetyTopics } from "@/components/safety/safetyData";
import SafetyTopicsList from "@/components/safety/SafetyTopicsList";

const Safety = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Sticky Top Button Menu */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 py-4 mb-6">
        <div className="flex flex-wrap gap-4">
          {safetyTopics.map((topic) => (
            <button
              key={topic.id}
              onClick={() => scrollToSection(topic.id)}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-600 transition"
            >
              {topic.title}
            </button>
          ))}
        </div>
      </div>

      {/* Section Content */}
      <div className="bg-white rounded-lg border p-4">
        <SafetyTopicsList topics={safetyTopics} />
      </div>

      {/* Return to Top Button */}
      <div className="flex justify-center mt-8">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="bg-blue-500 text-white px-8 py-4 rounded-lg hover:bg-blue-600 transition"
        >
          Return to Top
        </button>
      </div>
    </div>
  );
};

export default Safety;
