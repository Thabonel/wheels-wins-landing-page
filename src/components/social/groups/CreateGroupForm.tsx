
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

interface CreateGroupFormProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: () => void;
}

export default function CreateGroupForm({ isOpen, onClose, onGroupCreated }: CreateGroupFormProps) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const { user } = useAuth();

  const handleCreateGroup = async () => {
    if (!user) {
      toast.error("You must be logged in to create a group");
      return;
    }

    if (!newGroupName.trim()) {
      toast.error("Group name cannot be empty");
      return;
    }

    try {
      console.log("Attempting to create group:", { name: newGroupName, description: newGroupDescription, owner_id: user.id });
      toast.success(`Group "${newGroupName}" created successfully!`);

      setNewGroupName("");
      setNewGroupDescription("");
      onClose();
      onGroupCreated();
    } catch (err) {
      console.error("Error creating group:", err);
      toast.error(`Failed to create group: ${err.message}`);
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
          <Button onClick={handleCreateGroup}>
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
