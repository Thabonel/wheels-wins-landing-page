
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  globalNewsSources, 
  australianNewsSources, 
  usNewsSources, 
  europeanNewsSources 
} from "./constants";
import { Badge } from "@/components/ui/badge";

interface NewsSourceSelectorProps {
  selectedSources: string[];
  onSelectedSourcesChange: (sources: string[]) => void;
  userRegion?: string | null;
}

const NewsSourceSelector = ({ selectedSources, onSelectedSourcesChange, userRegion }: NewsSourceSelectorProps) => {
  const isAustralianUser = userRegion?.toLowerCase().includes('australia') || 
                           userRegion?.toLowerCase().includes('sydney') ||
                           userRegion?.toLowerCase().includes('melbourne');
  
  return (
    <div className="space-y-4 mb-4">
      {/* Australian Sources */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Australian News</h3>
          {isAustralianUser && (
            <Badge variant="secondary" className="text-xs">Recommended for {userRegion}</Badge>
          )}
        </div>
        <ToggleGroup 
          type="multiple" 
          value={selectedSources}
          onValueChange={onSelectedSourcesChange}
          className="flex-wrap justify-start"
        >
          {australianNewsSources.map((source) => (
            <ToggleGroupItem key={source.id} value={source.id} className="text-sm">
              {source.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Global Sources */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">International News</h3>
        <ToggleGroup 
          type="multiple" 
          value={selectedSources}
          onValueChange={onSelectedSourcesChange}
          className="flex-wrap justify-start"
        >
          {globalNewsSources.map((source) => (
            <ToggleGroupItem key={source.id} value={source.id} className="text-sm">
              {source.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* US Sources */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">US News</h3>
        <ToggleGroup 
          type="multiple" 
          value={selectedSources}
          onValueChange={onSelectedSourcesChange}
          className="flex-wrap justify-start"
        >
          {usNewsSources.map((source) => (
            <ToggleGroupItem key={source.id} value={source.id} className="text-sm">
              {source.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* European Sources */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">European News</h3>
        <ToggleGroup 
          type="multiple" 
          value={selectedSources}
          onValueChange={onSelectedSourcesChange}
          className="flex-wrap justify-start"
        >
          {europeanNewsSources.map((source) => (
            <ToggleGroupItem key={source.id} value={source.id} className="text-sm">
              {source.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
};

export default NewsSourceSelector;
