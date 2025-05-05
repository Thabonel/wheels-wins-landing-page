import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SafetyTopic } from "./types";

interface SafetyTopicGridProps {
  topics: SafetyTopic[];
}

const SafetyTopicGrid = ({ topics }: SafetyTopicGridProps) => {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      {topics.map((topic) => (
        <Link key={topic.id} to={topic.path}>
          <Button className="px-6 py-4 text-base w-full sm:w-auto">
            {topic.title}
          </Button>
        </Link>
      ))}
    </div>
  );
};

export default SafetyTopicGrid;
