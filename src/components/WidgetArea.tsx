
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NewsSourceSelector from "./news/NewsSourceSelector";
import NewsCollapsible from "./news/NewsCollapsible";
import { useNewsData } from "./news/useNewsData";

const WidgetArea = () => {
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const { newsItems, loading } = useNewsData(selectedSources);

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-2xl">News Aggregator</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Select your preferred news sources to see the latest updates from trusted outlets.
        </p>
        
        <NewsSourceSelector 
          selectedSources={selectedSources}
          onSelectedSourcesChange={setSelectedSources}
        />

        {selectedSources.length > 0 ? (
          <NewsCollapsible newsItems={newsItems} loading={loading} />
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-lg">No sources selected</p>
            <p>Choose your preferred news sources above to see the latest updates</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WidgetArea;
