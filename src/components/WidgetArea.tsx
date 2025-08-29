
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import NewsSourceSelector from "./news/NewsSourceSelector";
import NewsCollapsible from "./news/NewsCollapsible";
import { useNewsData } from "./news/useNewsData";
import { defaultSources, getDefaultSourcesByRegion } from "./news/constants";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";

const WidgetArea = () => {
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [userRegion, setUserRegion] = useState<string | null>(null);
  const { newsItems, loading, retryFetch } = useNewsData(selectedSources);
  const { user } = useAuth();

  // Fetch user's region from profile
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user?.email) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('region')
            .eq('email', user.email)
            .single();
          
          if (data && !error) {
            setUserRegion(data.region);
            console.log('User region detected:', data.region);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          // Default to Sydney/Australia if profile fetch fails
          setUserRegion('Sydney, Australia');
        }
      }
    };
    
    fetchUserProfile();
  }, [user]);

  // Auto-select default sources based on user's region
  useEffect(() => {
    // Check if user has saved preferences
    const savedSources = localStorage.getItem('news-selected-sources');
    if (savedSources) {
      setSelectedSources(JSON.parse(savedSources));
    } else {
      // Use region-based defaults for first-time users
      const regionDefaults = getDefaultSourcesByRegion(userRegion || 'australia');
      setSelectedSources(regionDefaults);
    }
  }, [userRegion]);

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
          userRegion={userRegion}
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
