
import { IncomeIdea } from "./types";
import IncomeIdeaCard from "./IncomeIdeaCard";

interface ActiveIdeasSectionProps {
  activeIdeas: IncomeIdea[];
}

export default function ActiveIdeasSection({ activeIdeas }: ActiveIdeasSectionProps) {
  return (
    <div>
      <h3 className="font-medium text-lg mb-3">Your Active Ideas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {activeIdeas.map((idea) => (
          <IncomeIdeaCard key={idea.id} {...idea} />
        ))}
      </div>
    </div>
  );
}
