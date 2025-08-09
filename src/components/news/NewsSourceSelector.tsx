
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { newsSources } from "./constants";

interface NewsSourceSelectorProps {
  selectedSources: string[];
  onSelectedSourcesChange: (sources: string[]) => void;
}

const NewsSourceSelector = ({ selectedSources, onSelectedSourcesChange }: NewsSourceSelectorProps) => {
  return (
    <ToggleGroup 
      type="multiple" 
      value={selectedSources}
      onValueChange={onSelectedSourcesChange}
      className="mb-4 flex-wrap justify-start"
    >
      {newsSources.map((source) => (
        <ToggleGroupItem key={source.id} value={source.id} className="text-sm">
          {source.name}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};

export default NewsSourceSelector;
