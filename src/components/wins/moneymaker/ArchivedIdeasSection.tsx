
import { useState } from "react";
import { IncomeIdea } from "./types";
import IncomeIdeaCard from "./IncomeIdeaCard";
import { Button } from "@/components/ui/button";

interface ArchivedIdeasSectionProps {
  archivedIdeas: IncomeIdea[];
}

export default function ArchivedIdeasSection({ archivedIdeas }: ArchivedIdeasSectionProps) {
  const [archivedOpen, setArchivedOpen] = useState(false);
  
  return (
    <div>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setArchivedOpen(!archivedOpen)}
        className="text-sm text-muted-foreground hover:text-foreground mb-3 p-0 h-auto font-normal"
      >
        {archivedOpen ? `Hide Archived Ideas (${archivedIdeas.length})` : `Show Archived Ideas (${archivedIdeas.length})`}
      </Button>
      
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
