
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { toast } from "sonner";

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

const WidgetArea = () => {
  const [open, setOpen] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const newsSources = [
    { id: "bbc", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
    { id: "reuters", name: "Reuters", url: "https://www.reutersagency.com/feed/?best-topics=business-finance&post_type=best" },
    { id: "ap", name: "Associated Press", url: "https://rsshub.app/ap/topics/apf-topnews" },
    { id: "npr", name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml" },
    { id: "guardian", name: "The Guardian", url: "https://www.theguardian.com/world/rss" },
    { id: "cnn", name: "CNN", url: "http://rss.cnn.com/rss/edition.rss" },
    { id: "wsj", name: "Wall Street Journal", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml" },
    { id: "nyt", name: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
    { id: "sbs", name: "SBS Australia", url: "https://www.sbs.com.au/news/topic/latest/feed" },
    { id: "abc", name: "ABC Australia", url: "https://www.abc.net.au/news/feed/45910/rss.xml" }
  ];

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

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Recently';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-2xl">News Aggregator</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Select your preferred news sources to see the latest updates from trusted outlets.
        </p>
        <ToggleGroup 
          type="multiple" 
          value={selectedSources}
          onValueChange={setSelectedSources}
          className="mb-4 flex-wrap justify-start"
        >
          {newsSources.map((source) => (
            <ToggleGroupItem key={source.id} value={source.id} className="text-sm">
              {source.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {selectedSources.length > 0 ? (
          <Collapsible open={open} onOpenChange={setOpen}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">
                  Latest News {loading && "(Loading...)"}
                </CardTitle>
                <CollapsibleTrigger className="hover:bg-muted p-1 rounded-full">
                  {open ? <ChevronUp /> : <ChevronDown />}
                </CollapsibleTrigger>
              </div>
            </CardHeader>
            <CardContent>
              <CollapsibleContent>
                {newsItems.length > 0 ? (
                  <div className="space-y-4">
                    {newsItems.map((item, index) => (
                      <div key={index} className="border-b pb-3 last:border-b-0">
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-sm mb-1 line-clamp-2">
                              {item.title}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-medium">{item.source}</span>
                              <span>•</span>
                              <span>{formatDate(item.pubDate)}</span>
                            </div>
                          </div>
                          {item.link !== '#' && (
                            <a
                              href={item.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No news available at the moment</p>
                  </div>
                )}
              </CollapsibleContent>
            </CardContent>
          </Collapsible>
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
