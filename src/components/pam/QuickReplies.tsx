
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

interface QuickRepliesProps {
  replies: string[];
  onReplyClick: (reply: string) => void;
  region: string;
}

const QuickReplies = ({ replies, onReplyClick, region }: QuickRepliesProps) => {
  return (
    <div className="space-y-2 mb-4">
      <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
        <MessageCircle size={14} />
        <span>Suggestions for {region}:</span>
      </h4>
      <div className="flex flex-wrap gap-2">
        {replies.map((reply, i) => (
          <Button 
            key={i} 
            variant="outline" 
            size="sm" 
            className="text-wrap text-left justify-start h-auto py-1.5 hover:bg-blue-50 border-blue-100 transition-colors"
            onClick={() => onReplyClick(reply)}
          >
            {reply}
          </Button>
        ))}
      </div>
    </div>
  );
};

export default QuickReplies;
