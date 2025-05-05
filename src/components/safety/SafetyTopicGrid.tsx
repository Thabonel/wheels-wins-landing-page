
import SafetyTopicCard from "./SafetyTopicCard";
import { SafetyTopic } from "./types";

interface SafetyTopicGridProps {
  topics: SafetyTopic[];
}

const SafetyTopicGrid = ({ topics }: SafetyTopicGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-12">
      {topics.map((topic) => (
        <SafetyTopicCard 
          key={topic.id}
          id={topic.id}
          title={topic.title}
          description={topic.description}
          icon={topic.icon}
        />
      ))}
    </div>
  );
};

export default SafetyTopicGrid;
