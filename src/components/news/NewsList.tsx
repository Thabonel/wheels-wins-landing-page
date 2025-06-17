
import { ExternalLink } from "lucide-react";
import { NewsItem } from "./types";

interface NewsListProps {
  newsItems: NewsItem[];
}

const NewsList = ({ newsItems }: NewsListProps) => {
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return 'Recently';
    }
  };

  if (newsItems.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>No news available at the moment</p>
      </div>
    );
  }

  return (
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
  );
};

export default NewsList;
