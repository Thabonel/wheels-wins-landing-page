
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { validateDrawerName } from './validation';

interface NewDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  existingDrawers: string[];
  isCreating: boolean;
}

const NewDrawerModal: React.FC<NewDrawerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingDrawers,
  isCreating
}) => {
  const [newDrawerName, setNewDrawerName] = useState("");
  const { toast } = useToast();

  const handleClose = () => {
    onClose();
    setNewDrawerName("");
  };

  const handleSave = async () => {
    const validationError = validateDrawerName(newDrawerName, existingDrawers);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }
    
    await onSave(newDrawerName.trim());
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Drawer</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Enter drawer name"
            value={newDrawerName}
            onChange={(e) => setNewDrawerName(e.target.value)}
            maxLength={50}
          />
          <p className="text-sm text-gray-500 mt-2">
            {newDrawerName.length}/50 characters
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Save"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewDrawerModal;
