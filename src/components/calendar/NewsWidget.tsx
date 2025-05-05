import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

type Article = {
  title: string;
  description: string;
  url: string;
  source: { name: string };
};

export default function NewsWidget() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch("https://newsapi.org/v2/top-headlines?country=au&category=general&pageSize=5&apiKey=demo");
        const data = await res.json();
        setArticles(data.articles || []);
      } catch (err) {
        console.error("Failed to fetch news:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <Card className="mt-4">
      <CardContent className="p-4">
        <h2 className="text-lg font-bold mb-2">Top News</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <ul className="space-y-3">
            {articles.map((article, index) => (
              <li key={index} className="text-sm">
                <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {article.title}
                </a>
                <p className="text-xs text-muted-foreground">{article.source.name}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
