
import { NewsSource } from './types';

// Global news sources
export const globalNewsSources: NewsSource[] = [
  { id: "bbc", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "reuters", name: "Reuters", url: "https://www.reutersagency.com/feed/?best-regions=asia&post_type=best" },
  { id: "ap", name: "Associated Press", url: "https://feeds.apnews.com/rss/apf-topnews" },
  { id: "npr", name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml" },
  { id: "guardian", name: "The Guardian", url: "https://www.theguardian.com/world/rss" },
  { id: "cnn", name: "CNN International", url: "https://rss.cnn.com/rss/edition_world.rss" },
  { id: "wsj", name: "Wall Street Journal", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml" },
  { id: "nyt", name: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { id: "bloomberg", name: "Bloomberg", url: "https://feeds.bloomberg.com/politics/news.rss" }
];

// Australian news sources
export const australianNewsSources: NewsSource[] = [
  { id: "abc-au", name: "ABC News Australia", url: "https://www.abc.net.au/news/feed/2942460/rss.xml" },
  { id: "smh", name: "Sydney Morning Herald", url: "https://www.smh.com.au/rss/feed.xml" },
  { id: "guardian-au", name: "Guardian Australia", url: "https://www.theguardian.com/au/rss" },
  { id: "news-com-au", name: "News.com.au", url: "https://www.news.com.au/content-feeds/latest-news-national/" },
  { id: "age", name: "The Age", url: "https://www.theage.com.au/rss/feed.xml" },
  { id: "australian", name: "The Australian", url: "https://www.theaustralian.com.au/feed/" },
  { id: "sbs", name: "SBS News", url: "https://www.sbs.com.au/news/feed" },
  { id: "9news", name: "9News", url: "https://www.9news.com.au/rss" }
];

// US news sources
export const usNewsSources: NewsSource[] = [
  { id: "cnn-us", name: "CNN US", url: "https://rss.cnn.com/rss/cnn_us.rss" },
  { id: "fox", name: "Fox News", url: "https://moxie.foxnews.com/google-publisher/latest.xml" },
  { id: "abc-us", name: "ABC News US", url: "https://abcnews.go.com/abcnews/topstories" },
  { id: "usa-today", name: "USA Today", url: "https://rssfeeds.usatoday.com/usatoday-NewsTopStories" },
  { id: "politico", name: "Politico", url: "https://www.politico.com/rss/politicopicks.xml" }
];

// European news sources
export const europeanNewsSources: NewsSource[] = [
  { id: "bbc-uk", name: "BBC UK", url: "https://feeds.bbci.co.uk/news/uk/rss.xml" },
  { id: "dw", name: "Deutsche Welle", url: "https://rss.dw.com/rdf/rss-en-all" },
  { id: "france24", name: "France 24", url: "https://www.france24.com/en/rss" },
  { id: "euronews", name: "Euronews", url: "https://www.euronews.com/rss" }
];

// Combine all sources for the complete list
export const newsSources: NewsSource[] = [
  ...globalNewsSources,
  ...australianNewsSources,
  ...usNewsSources,
  ...europeanNewsSources
];

// Function to get default sources based on user's region
export const getDefaultSourcesByRegion = (region?: string | null): string[] => {
  const regionLower = region?.toLowerCase() || '';
  
  // Australian regions
  if (regionLower.includes('australia') || regionLower.includes('sydney') || 
      regionLower.includes('melbourne') || regionLower.includes('brisbane') ||
      regionLower.includes('perth') || regionLower.includes('adelaide') ||
      regionLower.includes('au')) {
    return ["abc-au", "smh", "guardian-au", "bbc"];
  }
  
  // US regions
  if (regionLower.includes('united states') || regionLower.includes('usa') ||
      regionLower.includes('america') || regionLower.includes('us')) {
    return ["cnn-us", "npr", "usa-today", "reuters"];
  }
  
  // European regions
  if (regionLower.includes('europe') || regionLower.includes('uk') || 
      regionLower.includes('england') || regionLower.includes('germany') ||
      regionLower.includes('france') || regionLower.includes('eu')) {
    return ["bbc-uk", "guardian", "dw", "reuters"];
  }
  
  // Default global sources
  return ["bbc", "reuters", "guardian"];
};

// Default sources to auto-select for better UX (fallback if no region detected)
export const defaultSources = ["bbc", "reuters", "guardian"];
