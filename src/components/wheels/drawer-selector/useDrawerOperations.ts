
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/components/ui/use-toast";
import { drawerItems } from './constants';

export const useDrawerOperations = (onDrawerCreated?: (drawer: any) => void) => {
  const [existingDrawers, setExistingDrawers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const fetchExistingDrawers = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) return;

      const { data, error } = await supabase
        .from('drawers')
        .select('name')
        .eq('user_id', userData.user.id);

      if (error) {
        console.error("Error fetching existing drawers:", error);
        return;
      }

      setExistingDrawers(data?.map(d => d.name.toLowerCase()) || []);
    } catch (error) {
      console.error("Error in fetchExistingDrawers:", error);
    }
  };

  const createDrawer = async (name: string) => {
    setIsCreating(true);
    console.log("Creating drawer:", name);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        toast({
          title: "Authentication Error",
          description: "Could not get user information. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      const userId = userData.user.id;
      
      // Create the drawer
      const { data: drawerData, error: drawerError } = await supabase
        .from('drawers')
        .insert([{ name: name, photo_url: "", user_id: userId }])
        .select()
        .single();

      if (drawerError) {
        console.error("Error creating drawer:", drawerError);
        
        // Handle specific error cases
        if (drawerError.code === '23505') {
          toast({
            title: "Duplicate Drawer",
            description: "A drawer with this name already exists.",
            variant: "destructive",
          });
        } else if (drawerError.code === '42501') {
          toast({
            title: "Permission Error",
            description: "You don't have permission to create drawers. Please try logging in again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: `Failed to create drawer: ${drawerError.message}`,
            variant: "destructive",
          });
        }
        return;
      }

      // Create preset items if available
      const itemsToAdd = drawerItems[name];
      let insertedItems: any[] = [];
      
      if (itemsToAdd && drawerData) {
        const itemsToInsert = itemsToAdd.map(item => ({
          name: item,
          packed: false,
          drawer_id: drawerData.id,
          quantity: 1
        }));

        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .insert(itemsToInsert)
          .select();

        if (itemsError) {
          console.error("Error inserting preset items:", itemsError);
          toast({
            title: "Warning",
            description: "Drawer created but some preset items couldn't be added.",
          });
        } else {
          insertedItems = itemsData || [];
        }
      }

      // Update local state
      setExistingDrawers(prev => [...prev, name.toLowerCase()]);
      
      // Success notification
      toast({
        title: "Success",
        description: `${name} drawer created successfully${itemsToAdd ? ` with ${itemsToAdd.length} preset items` : ''}.`,
      });

      // Notify parent component
      onDrawerCreated?.({ 
        ...drawerData, 
        items: insertedItems 
      });

    } catch (error) {
      console.error("Unexpected error creating drawer:", error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  useEffect(() => {
    fetchExistingDrawers();
  }, []);

  return {
    existingDrawers,
    isCreating,
    createDrawer,
    fetchExistingDrawers
  };
};
