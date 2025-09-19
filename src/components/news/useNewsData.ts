
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { NewsItem } from "./types";
import { newsSources } from "./constants";

export const useNewsData = (selectedSources: string[]) => {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWithProxy = async (url: string): Promise<string> => {
    // Multiple CORS proxy fallbacks - reordered for better reliability
    const corsProxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://cors-anywhere.herokuapp.com/${url}`,
      `https://proxy.cors.sh/${url}`
    ];
    
    for (let i = 0; i < corsProxies.length; i++) {
      const corsProxy = corsProxies[i];
      
      try {
        console.log(`Fetching from: ${url} via proxy ${i + 1}/${corsProxies.length}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(corsProxy, {
          headers: i === 1 ? {
            'Accept': 'application/json'
          } : {
            'Accept': 'text/xml, application/xml, application/rss+xml, */*'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Handle different proxy response formats
        let content = '';
        if (i === 1) {
          // allorigins format (now at index 1) - returns JSON with contents field
          const data = await response.json();
          content = data.contents || '';
        } else {
          // corsproxy.io, cors-anywhere, and proxy.cors.sh return direct XML content
          content = await response.text();
        }
        
        if (!content) {
          throw new Error('No content returned from proxy');
        }
        
        return content;
      } catch (error) {
        console.warn(`Proxy ${i + 1} failed for ${url}:`, error);
        
        // If this was the last proxy, throw the error
        if (i === corsProxies.length - 1) {
          throw error;
        }
      }
    }
    
    throw new Error('All CORS proxies failed');
  };

  const parseRSSFeed = (xmlContent: string, sourceName: string): NewsItem[] => {
    try {
      console.log(`Parsing RSS for ${sourceName}, content length: ${xmlContent.length}`);
      
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        console.error('XML parsing error:', parserError.textContent);
        throw new Error('XML parsing failed');
      }
      
      // Try different RSS/Atom selectors
      let items = xmlDoc.querySelectorAll('item');
      if (items.length === 0) {
        items = xmlDoc.querySelectorAll('entry'); // Atom feeds
      }
      
      console.log(`Found ${items.length} items for ${sourceName}`);
      
      if (items.length === 0) {
        // Log the structure to help debug
        console.log('XML structure:', xmlDoc.documentElement?.tagName, xmlDoc.documentElement?.children.length);
        throw new Error('No items found in feed');
      }
      
      const newsItems: NewsItem[] = [];
      
      for (let i = 0; i < Math.min(items.length, 5); i++) {
        const item = items[i];
        
        // Try different title selectors
        const titleEl = item.querySelector('title');
        const title = titleEl?.textContent?.trim() || 'Untitled';
        
        // Try different link selectors
        const linkEl = item.querySelector('link');
        let link = linkEl?.textContent?.trim() || 
                  linkEl?.getAttribute('href')?.trim() || 
                  item.querySelector('guid')?.textContent?.trim() || '#';
        
        // Clean up link if it's not a proper URL
        if (link && !link.startsWith('http')) {
          // Some feeds have the link as text content of <link> element
          const parentLink = item.querySelector('link')?.textContent?.trim();
          if (parentLink && parentLink.startsWith('http')) {
            link = parentLink;
          } else {
            link = '#';
          }
        }
        
        // Try different date selectors
        const pubDateEl = item.querySelector('pubDate') || 
                         item.querySelector('published') || 
                         item.querySelector('dc\\:date');
        const pubDate = pubDateEl?.textContent?.trim() || new Date().toISOString();
        
        if (title && title !== 'Untitled') {
          newsItems.push({
            title: title.length > 150 ? `${title.substring(0, 150)  }...` : title,
            link,
            pubDate,
            source: sourceName
          });
        }
      }
      
      console.log(`Successfully parsed ${newsItems.length} items from ${sourceName}`);
      return newsItems;
    } catch (error) {
      console.error(`RSS parsing error for ${sourceName}:`, error);
      return [];
    }
  };

  const fetchNews = async () => {
    if (selectedSources.length === 0) {
      setNewsItems([]);
      return;
    }

    setLoading(true);
    console.log('Starting news fetch for sources:', selectedSources);
    
    try {
      const allNews: NewsItem[] = [];
      let successCount = 0;
      
      for (const sourceId of selectedSources) {
        const source = newsSources.find(s => s.id === sourceId);
        if (!source) {
          console.warn(`Source not found: ${sourceId}`);
          continue;
        }

        try {
          console.log(`Fetching news from ${source.name} (${source.url})`);
          const xmlContent = await fetchWithProxy(source.url);
          const sourceNews = parseRSSFeed(xmlContent, source.name);
          
          if (sourceNews.length > 0) {
            allNews.push(...sourceNews);
            successCount++;
            console.log(`✓ Successfully fetched ${sourceNews.length} items from ${source.name}`);
          } else {
            console.warn(`No news items parsed from ${source.name}`);
          }
        } catch (error) {
          console.error(`✗ Error fetching news from ${source.name}:`, error);
        }
      }

      if (allNews.length > 0) {
        // Sort by date (newest first) and limit to 20 items
        const sortedNews = allNews
          .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime())
          .slice(0, 20);
        
        setNewsItems(sortedNews);
        console.log(`Successfully loaded ${sortedNews.length} news items from ${successCount} sources`);
        
        // Show partial success message if some sources failed
        if (successCount < selectedSources.length) {
          const failedCount = selectedSources.length - successCount;
          toast.warning(`Loaded news from ${successCount} sources. ${failedCount} sources failed to load.`);
        }
      } else {
        console.warn('No news items loaded from any source');
        toast.error(`Unable to load news from any of the ${selectedSources.length} selected sources. Please check your internet connection and try again.`);
        setNewsItems([]);
      }
    } catch (error) {
      console.error('Error in fetchNews:', error);
      toast.error('Failed to fetch news');
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
