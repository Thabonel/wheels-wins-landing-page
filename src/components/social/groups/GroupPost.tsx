
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ThumbsUp, MessageSquare } from "lucide-react";
import { SocialPost } from "../types";

interface GroupPostProps {
  post: SocialPost;
  isPending?: boolean;
  onModerate?: (postId: string, approve: boolean) => void;
  showModerationButtons?: boolean;
}

export default function GroupPost({ post, isPending = false, onModerate, showModerationButtons = false }: GroupPostProps) {
  return (
    <Card className={isPending ? "border-2 border-amber-200" : ""}>
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
        <Avatar className="w-10 h-10">
          <img src={post.authorAvatar} alt={post.author} />
        </Avatar>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{post.author}</h4>
            {isPending && <Badge className="bg-amber-500">Pending</Badge>}
            {post.isOwnPost && <Badge variant="outline">You</Badge>}
          </div>
          <p className="text-sm text-gray-500">{post.date}</p>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-line">{post.content}</p>
        {post.image && (
          <div className="mt-4">
            <img 
              src={post.image} 
              alt="Post image" 
              className="rounded-md max-h-[300px] object-cover" 
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4">
        {showModerationButtons && onModerate ? (
          <div className="flex gap-4 w-full">
            <Button 
              variant="default"
              className="bg-green-600 hover:bg-green-700" 
              onClick={() => onModerate(post.id, true)}
            >
              Approve
            </Button>
            <Button 
              variant="outline"
              className="text-red-600 border-red-600 hover:bg-red-50" 
              onClick={() => onModerate(post.id, false)}
            >
              Reject
            </Button>
          </div>
        ) : (
          <div className="flex gap-6 w-full">
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              <ThumbsUp size={18} /> {post.likes}
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center gap-1">
              <MessageSquare size={18} /> {post.comments}
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
