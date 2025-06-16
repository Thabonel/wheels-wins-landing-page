
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { NewsItem } from "./types";
import { newsSources } from "./constants";

export const useNewsData = (selectedSources: string[]) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNews = async () => {
    if (selectedSources.length === 0) {
      setNewsItems([]);
      return;
    }

    setLoading(true);
    try {
      const allNews: NewsItem[] = [];
      
      for (const sourceId of selectedSources) {
        const source = newsSources.find(s => s.id === sourceId);
        if (!source) continue;

        try {
          // Use RSS2JSON service to convert RSS to JSON
          const response = await fetch(
            `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}&api_key=YOUR_API_KEY&count=5`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'ok' && data.items) {
              const sourceNews = data.items.map((item: any) => ({
                title: item.title,
                link: item.link,
                pubDate: item.pubDate,
                source: source.name
              }));
              allNews.push(...sourceNews);
            }
          }
        } catch (error) {
          console.error(`Error fetching news from ${source.name}:`, error);
        }
      }

      // If RSS2JSON fails, provide sample news data
      if (allNews.length === 0) {
        const sampleNews = selectedSources.map((sourceId, index) => {
          const source = newsSources.find(s => s.id === sourceId);
          return {
            title: `Breaking: Latest updates from ${source?.name || 'News Source'}`,
            link: '#',
            pubDate: new Date().toISOString(),
            source: source?.name || 'News Source'
          };
        });
        allNews.push(...sampleNews);
      }

      // Sort by date and limit to 10 items
      const sortedNews = allNews
        .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
        .slice(0, 10);

      setNewsItems(sortedNews);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('Failed to fetch news. Showing sample data.');
      
      // Fallback to sample data
      const sampleNews = selectedSources.map((sourceId, index) => {
        const source = newsSources.find(s => s.id === sourceId);
        return {
          title: `Latest news from ${source?.name}: Global markets show mixed signals as economic indicators point to steady growth.`,
          link: '#',
          pubDate: new Date(Date.now() - index * 3600000).toISOString(),
          source: source?.name || 'News Source'
        };
      });
      setNewsItems(sampleNews);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [selectedSources]);

  return { newsItems, loading };
};
