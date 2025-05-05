import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const WidgetArea = () => {
  const [open, setOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-2xl">News Aggregator</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Select your preferred news sources to see updates tailored to your interests.
        </p>
        <ToggleGroup 
          type="multiple" 
          value={selectedSources}
          onValueChange={setSelectedSources}
          className="mb-4"
        >
          <ToggleGroupItem value="abc" className="text-sm">ABC News</ToggleGroupItem>
          <ToggleGroupItem value="bbc" className="text-sm">BBC World</ToggleGroupItem>
          <ToggleGroupItem value="reuters" className="text-sm">Reuters</ToggleGroupItem>
          <ToggleGroupItem value="travel" className="text-sm">Travel Alerts</ToggleGroupItem>
        </ToggleGroup>

        {selectedSources.length > 0 ? (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Top News</CardTitle>
                <CollapsibleTrigger className="hover:bg-muted p-1 rounded-full">
                  {open ? <ChevronUp /> : <ChevronDown />}
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CardContent>
              <CollapsibleContent>
                <ul className="list-disc list-inside space-y-1">
                  <li>Breaking: Sample headline from selected sources.</li>
                  <li>Weather alerts affecting the East Coast.</li>
                  <li>Global markets slightly up as reports roll in.</li>
                </ul>
              </CollapsibleContent>
            </CardContent>
          </Collapsible>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-lg">No sources selected</p>
            <p>Choose your preferred news sources above</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WidgetArea;
