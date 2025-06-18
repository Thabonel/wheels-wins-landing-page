
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { IncomeIdea } from "./types";
import IncomeIdeaCard from "./IncomeIdeaCard";

interface ArchivedIdeasSectionProps {
  archivedIdeas: IncomeIdea[];
}

export default function ArchivedIdeasSection({ archivedIdeas }: ArchivedIdeasSectionProps) {
  const [archivedOpen, setArchivedOpen] = useState(false);
  
  return (
    <div>
      <button
        onClick={() => setArchivedOpen(!archivedOpen)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
      >
        <span>Archived Ideas ({archivedIdeas.length})</span>
        {archivedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      
      {archivedOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {archivedIdeas.map((idea) => (
            <IncomeIdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}
    </div>
  );
}
