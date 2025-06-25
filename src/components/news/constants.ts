
import { NewsSource } from './types';

export const newsSources: NewsSource[] = [
  { id: "bbc", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
  { id: "reuters", name: "Reuters", url: "https://feeds.reuters.com/reuters/topNews" },
  { id: "ap", name: "Associated Press", url: "https://feeds.apnews.com/rss/apf-topnews" },
  { id: "npr", name: "NPR News", url: "https://feeds.npr.org/1001/rss.xml" },
  { id: "guardian", name: "The Guardian", url: "https://www.theguardian.com/world/rss" },
  { id: "cnn", name: "CNN", url: "http://rss.cnn.com/rss/edition.rss" },
  { id: "wsj", name: "Wall Street Journal", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml" },
  { id: "nyt", name: "New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml" },
  { id: "abc", name: "ABC News", url: "https://abcnews.go.com/abcnews/topstories" },
  { id: "fox", name: "Fox News", url: "https://moxie.foxnews.com/google-publisher/latest.xml" }
];
