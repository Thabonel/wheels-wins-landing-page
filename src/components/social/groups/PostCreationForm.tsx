
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface PostCreationFormProps {
  newGroupPost: string;
  setNewGroupPost: (content: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export default function PostCreationForm({ 
  newGroupPost, 
  setNewGroupPost, 
  onSubmit, 
  isSubmitting 
}: PostCreationFormProps) {
  return (
    <Card className="border-2 border-blue-100 mb-6">
      <CardContent className="pt-6">
        <h3 className="text-lg font-semibold mb-3">Create a new post</h3>
        <Textarea 
          value={newGroupPost} 
          onChange={(e) => setNewGroupPost(e.target.value)}
          placeholder="Share something with the group..."
          className="min-h-[120px] mb-4"
          disabled={isSubmitting}
        />
        <div className="flex justify-end">
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !newGroupPost.trim()}
          >
            {isSubmitting ? "Submitting..." : "Post to Group"}
          </Button>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Group posts require approval from the group admin
        </div>
      </CardContent>
    </Card>
  );
}
