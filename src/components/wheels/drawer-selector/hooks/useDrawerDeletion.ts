import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { deleteDrawerWithItems } from '../services/drawerService';

export const useDrawerDeletion = (
  authState: string,
  setExistingDrawers: (fn: (prev: string[]) => string[]) => void,
  onDrawerDeleted?: (drawer: any) => void
) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const deleteDrawer = async (name: string) => {
    if (authState !== 'authenticated') {
      toast({
        title: "Authentication Required",
        description: "Please log in to delete drawers.",
        variant: "destructive",
      });
      return;
    }

    setIsDeleting(true);
    
    try {
      await deleteDrawerWithItems(name);
      
      // Update local state
      setExistingDrawers(prev => prev.filter(drawer => drawer !== name.toLowerCase()));
      
      // Success notification
      toast({
        title: "Success",
        description: `${name} drawer deleted successfully.`,
      });

      // Notify parent component
      onDrawerDeleted?.({ name });

    } catch (error: any) {
      console.error("Error deleting drawer:", error);
      
      toast({
        title: "Error",
        description: `Failed to delete drawer: ${error.message || 'Please try again.'}`,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isDeleting,
    deleteDrawer
  };
};