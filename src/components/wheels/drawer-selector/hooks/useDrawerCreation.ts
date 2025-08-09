
import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { createDrawerWithItems } from '../services/drawerService';

export const useDrawerCreation = (
  authState: string,
  existingDrawers: string[],
  setExistingDrawers: (fn: (prev: string[]) => string[]) => void,
  onDrawerCreated?: (drawer: any) => void
) => {
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createDrawer = async (name: string) => {
    if (authState !== 'authenticated') {
      toast({
        title: "Authentication Required",
        description: "Please log in to create drawers.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    
    try {
      const result = await createDrawerWithItems(name);
      
      // Update local state
      setExistingDrawers(prev => [...prev, name.toLowerCase()]);
      
      // Success notification
      const itemsText = result.hasPresetItems ? ` with ${result.items.length} preset items` : '';
      toast({
        title: "Success",
        description: `${name} drawer created successfully${itemsText}.`,
      });

      // Notify parent component
      onDrawerCreated?.({ 
        ...result.drawer, 
        items: result.items,
        isOpen: false
      });

    } catch (error: any) {
      console.error("Error creating drawer:", error);
      
      if (error.code === '23505') {
        toast({
          title: "Duplicate Drawer",
          description: "A drawer with this name already exists.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: `Failed to create drawer: ${error.message || 'Please try again.'}`,
          variant: "destructive",
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  return {
    isCreating,
    createDrawer
  };
};
