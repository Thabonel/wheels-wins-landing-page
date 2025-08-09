
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/common/AnimatedDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { IncomeIdea } from "./types";
import { Share2, X } from "lucide-react";

interface ShareToHustleBoardModalProps {
  idea: IncomeIdea;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareToHustleBoardModal({
  idea,
  isOpen,
  onClose,
}: ShareToHustleBoardModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(idea.name);
  const [description, setDescription] = useState(idea.notes || "");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleSubmit = async () => {
    if (!user || !title.trim() || !description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('hustle_ideas')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim(),
          avg_earnings: Math.round(idea.monthlyIncome),
          rating: 4.0, // Default rating for user-submitted ideas
          likes: 0,
          trending: false,
          tags: tags.length > 0 ? tags : ['general'],
          status: 'pending' // Will need admin approval
        });

      if (error) {
        console.error('Error sharing to hustle board:', error);
        toast.error('Failed to share your idea');
        return;
      }

      toast.success('Your idea has been submitted to the Hustle Board for review!');
      onClose();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 size={20} />
            Share "{idea.name}" to Hustle Board
          </DialogTitle>
          <DialogDescription>
            Help other travelers by sharing your successful money-making strategy.
            Your idea will be reviewed before being published.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a catchy title for your idea"
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description *</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe how this income idea works, what's needed to get started, and any tips for success..."
              className="mt-1 min-h-[100px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Average Monthly Income</label>
            <div className="mt-1 p-3 bg-green-50 rounded-md">
              <span className="text-lg font-bold text-green-600">
                ${idea.monthlyIncome.toLocaleString()}/month
              </span>
              <p className="text-sm text-muted-foreground">
                Based on your current earnings from this idea
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Tags</label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add tags (e.g., remote, creative, low-startup)"
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X size={12} className="cursor-pointer" onClick={() => handleRemoveTag(tag)} />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Share to Hustle Board"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
