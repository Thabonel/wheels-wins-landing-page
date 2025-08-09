
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import NewsList from "./NewsList";
import { NewsItem } from "./types";

interface NewsCollapsibleProps {
  newsItems: NewsItem[];
  loading: boolean;
}

const NewsCollapsible = ({ newsItems, loading }: NewsCollapsibleProps) => {
  const [open, setOpen] = useState(false);

  return (
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
          <NewsList newsItems={newsItems} />
        </CollapsibleContent>
      </CardContent>
    </Collapsible>
  );
};

export default NewsCollapsible;
