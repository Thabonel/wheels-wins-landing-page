import { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ThumbsUp, Send } from "lucide-react";
import { TipData } from "./types";

interface TipCardProps {
  tip: TipData;
}

export default function TipCard({ tip }: TipCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              {tip.title}
              {tip.isNew && <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">New</Badge>}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-1">
              <span>From: {tip.source}</span>
              <span className="text-muted-foreground inline-flex items-center gap-1 ml-3">
                <ThumbsUp className="h-3 w-3" /> {tip.likes}
              </span>
            </CardDescription>
          </div>
          <Collapsible>
            <CollapsibleTrigger 
              onClick={() => setIsExpanded(!isExpanded)} 
              className="rounded-full h-6 w-6 flex items-center justify-center hover:bg-muted"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'transform rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-3">
                <p className="text-sm">{tip.content}</p>
              </CardContent>
              <CardFooter className="pt-0 pb-3 flex justify-end gap-2">
                <Button size="sm" variant="ghost" className="text-muted-foreground">
                  <ThumbsUp className="h-4 w-4 mr-1" />
                  Like
                </Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground">
                  <Send className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </CardFooter>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </CardHeader>
    </Card>
  );
}
