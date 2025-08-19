
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NewsSourceSelector from "./news/NewsSourceSelector";
import NewsCollapsible from "./news/NewsCollapsible";
import { useNewsData } from "./news/useNewsData";
import { defaultSources } from "./news/constants";

const WidgetArea = () => {
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const { newsItems, loading, retryFetch } = useNewsData(selectedSources);

  // Auto-select default sources on component mount
  useEffect(() => {
    // Check if user has saved preferences
    const savedSources = localStorage.getItem('news-selected-sources');
    if (savedSources) {
      setSelectedSources(JSON.parse(savedSources));
    } else {
      // Use default sources for first-time users
      setSelectedSources(defaultSources);
    }
  }, []);

  // Save user preferences when sources change
  useEffect(() => {
    if (selectedSources.length > 0) {
      localStorage.setItem('news-selected-sources', JSON.stringify(selectedSources));
    }
  }, [selectedSources]);

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
          <NewsCollapsible newsItems={newsItems} loading={loading} onRetry={retryFetch} />
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-lg">Loading news sources...</p>
            <p className="text-sm">Setting up your personalized news feed</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WidgetArea;
