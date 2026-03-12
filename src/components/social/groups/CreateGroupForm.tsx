
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/common/AnimatedDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ProfileImageUpload } from "@/components/profile/ProfileImageUpload";

interface CreateGroupFormProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

export default function CreateGroupForm({ isOpen, onClose, onGroupCreated }: CreateGroupFormProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [groupImageUrl, setGroupImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleImageUpload = (url: string | null) => {
    setGroupImageUrl(url);
  };

  const handleCreateGroup = async () => {
    if (!user) {
      toast.error("You must be logged in to create a group");
      return;
    }

    if (!newGroupName.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from('social_groups')
        .insert({
          name: newGroupName.trim(),
          description: newGroupDescription.trim() || null,
          avatar_url: groupImageUrl,
          owner_id: user.id,
          admin_id: user.id,
          member_count: 1
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating group:", error);
        toast.error("Failed to create group");
        return;
      }

      // Add creator as first member
      const { error: memberError } = await supabase
        .from('social_group_members')
        .insert({
          group_id: data.id,
          user_id: user.id,
          role: 'admin'
        });

      if (memberError) {
        console.error("Error adding creator as member:", memberError);
        // Group was created but failed to add member - still show success
      }

      toast.success(`Group "${newGroupName}" created successfully!`);

      setNewGroupName("");
      setNewGroupDescription("");
      setGroupImageUrl(null);
      onClose();
      onGroupCreated();
    } catch (err) {
      console.error("Error creating group:", err);
      toast.error("Failed to create group");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <ProfileImageUpload
              imageUrl={groupImageUrl || undefined}
              onImageUploaded={handleImageUpload}
              label="Group Cover Image"
              altText="Group Cover"
              size="lg"
              type="group"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Group Name</label>
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Enter group name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              placeholder="Describe your group"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleCreateGroup} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Group"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
