import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface SubmitIdeaFormProps {
  isOpen: boolean;
  onClose: () => void;
  onIdeaSubmitted: () => void;
}

export default function SubmitIdeaForm({ isOpen, onClose, onIdeaSubmitted }: SubmitIdeaFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    avg_earnings: "",
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState("");

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to submit an idea");
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('hustle_ideas')
        .insert({
          title: formData.title.trim(),
          description: formData.description.trim(),
          image: formData.image.trim() || null,
          avg_earnings: parseFloat(formData.avg_earnings) || 0,
          tags: formData.tags,
          user_id: user.id,
          status: 'pending', // Will need admin approval
          rating: 0,
          likes: 0,
          trending: false
        });

      if (error) {
        console.error('Error submitting idea:', error);
        toast.error('Failed to submit your idea. Please try again.');
        return;
      }

      toast.success('Your hustle idea has been submitted for review!');
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        image: "",
        avg_earnings: "",
        tags: []
      });
      
      onIdeaSubmitted();
      onClose();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Your Hustle Idea</DialogTitle>
          <DialogDescription>
            Share your money-making strategy with fellow travelers. Your submission will be reviewed before being published.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Remote Freelance Writing"
              maxLength={100}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your hustle idea, how to get started, tips for success..."
              rows={4}
              maxLength={1000}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="avg_earnings">Average Monthly Earnings (USD)</Label>
            <Input
              id="avg_earnings"
              type="number"
              value={formData.avg_earnings}
              onChange={(e) => handleInputChange('avg_earnings', e.target.value)}
              placeholder="e.g., 1500"
              min="0"
              step="50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Image URL (optional)</Label>
            <Input
              id="image"
              type="url"
              value={formData.image}
              onChange={(e) => handleInputChange('image', e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                <Plus size={16} />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X size={12} />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Submitting..." : "Submit Idea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}