
import SafetyTopicDetail from "./SafetyTopicDetail";
import { SafetyTopic } from "./types";

interface SafetyTopicsListProps {
  topics: SafetyTopic[];
}

const SafetyTopicsList = ({ topics }: SafetyTopicsListProps) => {
  return (
    <div className="space-y-8">
      {topics.map((topic) => (
        <SafetyTopicDetail 
          key={topic.id}
          id={topic.id}
          title={topic.title}
          icon={topic.icon}
          content={topic.content}
        />
      ))}
    </div>
  );
};

export default SafetyTopicsList;
