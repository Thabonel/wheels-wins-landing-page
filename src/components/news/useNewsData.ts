
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
          // Use AllOrigins as a CORS proxy to fetch RSS feeds directly
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(source.url)}`;
          const response = await fetch(proxyUrl);
          
          if (response.ok) {
            const data = await response.json();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(data.contents, 'text/xml');
            
            // Parse RSS/XML
            const items = xmlDoc.querySelectorAll('item');
            const sourceNews: NewsItem[] = [];
            
            for (let i = 0; i < Math.min(items.length, 5); i++) {
              const item = items[i];
              const title = item.querySelector('title')?.textContent || '';
              const link = item.querySelector('link')?.textContent || '#';
              const pubDate = item.querySelector('pubDate')?.textContent || new Date().toISOString();
              
              if (title) {
                sourceNews.push({
                  title: title.trim(),
                  link: link.trim(),
                  pubDate,
                  source: source.name
                });
              }
            }
            
            allNews.push(...sourceNews);
          }
        } catch (error) {
          console.error(`Error fetching news from ${source.name}:`, error);
          // Add a sample news item as fallback
          allNews.push({
            title: `Latest updates from ${source.name} - Unable to fetch live news at the moment`,
            link: '#',
            pubDate: new Date().toISOString(),
            source: source.name
          });
        }
      }

      // If no news was fetched, provide sample data
      if (allNews.length === 0) {
        const sampleNews = selectedSources.map((sourceId, index) => {
          const source = newsSources.find(s => s.id === sourceId);
          return {
            title: `Breaking: Latest updates from ${source?.name || 'News Source'}`,
            link: '#',
            pubDate: new Date(Date.now() - index * 3600000).toISOString(),
            source: source?.name || 'News Source'
          };
        });
        allNews.push(...sampleNews);
      }

      // Sort by date and limit to 15 items
      const sortedNews = allNews
        .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
        .slice(0, 15);

      setNewsItems(sortedNews);
    } catch (error) {
      console.error('Error fetching news:', error);
      toast.error('Unable to fetch live news. Showing sample data.');
      
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
