
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/AuthContext";

interface StorageItem {
  id: string;
  name: string;
  packed: boolean;
  quantity: number;
}

interface StorageDrawer {
  id: string;
  name: string;
  photo_url: string;
  items: StorageItem[];
  isOpen?: boolean;
}

export const useStorageData = () => {
  const [storage, setStorage] = useState<StorageDrawer[]>([]);
  const [missingItems, setMissingItems] = useState<any[]>([]);
  const [listId, setListId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();

  const fetchStorage = async () => {
    if (!isAuthenticated || !user) {
      setStorage([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('drawers')
        .select(`
          id,
          name,
          photo_url,
          items(id, name, packed, quantity)
        `);

      if (error) {
        console.error("Error fetching storage:", error);
        toast({
          title: "Error",
          description: "Unable to fetch your storage data. Please try refreshing the page.",
          variant: "destructive",
        });
        return;
      }

      setStorage(data || []);
    } catch (error) {
      console.error("Unexpected error fetching storage:", error);
      toast({
        title: "Error", 
        description: "An unexpected error occurred while fetching your data.",
        variant: "destructive",
      });
    }
  };

  const handleDrawerCreated = (drawer: StorageDrawer) => {
    setStorage(prev => [...prev, drawer]);
  };

  const toggleDrawerState = (drawerId: string) => {
    setStorage(prev => 
      prev.map(drawer => 
        drawer.id === drawerId 
          ? { ...drawer, isOpen: !drawer.isOpen }
          : drawer
      )
    );
  };

  const toggleItemPacked = async (itemId: string, packed: boolean) => {
    if (!isAuthenticated || !user) return;

    try {
      const { error } = await supabase
        .from('items')
        .update({ packed })
        .eq('id', itemId);

      if (error) {
        console.error("Error updating item:", error);
        toast({
          title: "Error",
          description: "Failed to update item status.",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setStorage(prev => 
        prev.map(drawer => ({
          ...drawer,
          items: drawer.items.map(item => 
            item.id === itemId ? { ...item, packed } : item
          )
        }))
      );
    } catch (error) {
      console.error("Unexpected error updating item:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while updating the item.",
        variant: "destructive",
      });
    }
  };

  const generateMissingItems = async (): Promise<boolean> => {
    if (!isAuthenticated || !user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create shopping lists.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const unpackedItems = storage.flatMap(drawer => 
        drawer.items
          .filter(item => !item.packed)
          .map(item => ({
            name: item.name,
            quantity: item.quantity,
            drawer: drawer.name
          }))
      );

      if (unpackedItems.length === 0) {
        toast({
          title: "No Missing Items",
          description: "All items are already packed!",
        });
        return false;
      }

      const { data, error } = await supabase
        .from('shopping_lists')
        .insert([{
          user_id: user.id,
          items: unpackedItems
        }])
        .select()
        .single();

      if (error) {
        console.error("Error creating shopping list:", error);
        toast({
          title: "Error",
          description: "Failed to create shopping list.",
          variant: "destructive",
        });
        return false;
      }

      setMissingItems(unpackedItems);
      setListId(data.id);
      
      toast({
        title: "Shopping List Created",
        description: `Created shopping list with ${unpackedItems.length} items.`,
      });

      return true;
    } catch (error) {
      console.error("Unexpected error generating shopping list:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while creating the shopping list.",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchStorage();
  }, [isAuthenticated, user]);

  return {
    storage,
    missingItems,
    listId,
    handleDrawerCreated,
    toggleDrawerState,
    toggleItemPacked,
    generateMissingItems,
  };
};
