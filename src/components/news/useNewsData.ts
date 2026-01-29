import { useState, useEffect } from "react";
import { toast } from "sonner";
import { NewsItem } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const useNewsData = (selectedSources: string[]) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNews = async () => {
    if (selectedSources.length === 0) {
      setNewsItems([]);
      return;
    }

    setLoading(true);
    console.log('Fetching news from backend API for sources:', selectedSources);

    try {
      // Build query string with selected sources
      const sourcesQuery = selectedSources.map(s => `sources=${encodeURIComponent(s)}`).join('&');
      const url = `${API_BASE_URL}/api/news/feed?${sourcesQuery}&limit_per_source=5&total_limit=20`;

      console.log('Fetching from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log('Backend response:', data);

      if (data.success && data.items && data.items.length > 0) {
        setNewsItems(data.items);
        console.log(`Successfully loaded ${data.items.length} news items from ${data.successful_sources.length} sources`);

        // Show partial success message if some sources failed
        if (data.failed_sources && data.failed_sources.length > 0) {
          const failedCount = data.failed_sources.length;
          const successCount = data.successful_sources.length;
          toast.warning(`Loaded news from ${successCount} sources. ${failedCount} sources failed to load.`);
        }
      } else {
        console.warn('No news items returned from backend');
        toast.error(`Unable to load news from the selected sources. Please try again later.`);
        setNewsItems([]);
      }
    } catch (error) {
      console.error('Error fetching news from backend:', error);
      toast.error('Failed to fetch news. Please check your connection and try again.');
      setNewsItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [selectedSources]);

  const retryFetch = () => {
    fetchNews();
  };

  return { newsItems, loading, retryFetch };
};
