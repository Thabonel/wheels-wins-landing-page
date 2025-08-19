
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import NewsList from "./NewsList";
import { NewsItem } from "./types";

interface NewsCollapsibleProps {
  newsItems: NewsItem[];
  loading: boolean;
  onRetry?: () => void;
}

const NewsCollapsible = ({ newsItems, loading, onRetry }: NewsCollapsibleProps) => {
  const [open, setOpen] = useState(true); // Default to open for better UX

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">
            Latest News {loading ? "(Loading...)" : newsItems.length > 0 ? `(${newsItems.length} articles)` : ""}
          </CardTitle>
          <CollapsibleTrigger className="hover:bg-muted p-1 rounded-full">
            {open ? <ChevronUp /> : <ChevronDown />}
          </CollapsibleTrigger>
        </div>
      </CardHeader>
      <CardContent>
        <CollapsibleContent>
          {!loading && newsItems.length === 0 && onRetry ? (
            <div className="text-center py-4 text-muted-foreground">
              <p className="mb-3">No news articles loaded</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRetry}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
            </div>
          ) : (
            <NewsList newsItems={newsItems} />
          )}
        </CollapsibleContent>
      </CardContent>
    </Collapsible>
  );
};

export default NewsCollapsible;
