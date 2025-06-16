
import { NewsSource } from './types';

export const newsSources: NewsSource[] = [
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
