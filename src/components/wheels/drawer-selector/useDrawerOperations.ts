
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/components/ui/use-toast";
import { drawerItems } from './constants';

export const useDrawerOperations = (onDrawerCreated?: (drawer: any) => void) => {
  const [existingDrawers, setExistingDrawers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const { toast } = useToast();

  // Simplified auth state monitoring
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setAuthState(session?.user ? 'authenticated' : 'unauthenticated');
      } catch (error) {
        console.error("Auth check failed:", error);
        setAuthState('unauthenticated');
      }
    };

    checkAuthState();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setAuthState(session?.user ? 'authenticated' : 'unauthenticated');
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchExistingDrawers = async () => {
    if (authState !== 'authenticated') {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('drawers')
        .select('name');

      if (error) {
        console.error("Error fetching existing drawers:", error);
        if (error.code === '42501') {
          toast({
            title: "Permission Error",
            description: "Unable to access your drawers. Please try refreshing the page.",
            variant: "destructive",
          });
        }
        return;
      }

      setExistingDrawers(data?.map(d => d.name.toLowerCase()) || []);
    } catch (error) {
      console.error("Unexpected error in fetchExistingDrawers:", error);
    }
  };

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
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        throw new Error("Authentication failed");
      }

      const userId = userData.user.id;
      
      // Create drawer
      const { data: drawerData, error: drawerError } = await supabase
        .from('drawers')
        .insert([{ name: name.trim(), photo_url: "", user_id: userId }])
        .select()
        .single();

      if (drawerError) {
        if (drawerError.code === '23505') {
          toast({
            title: "Duplicate Drawer",
            description: "A drawer with this name already exists.",
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
            title: "Partial Success",
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
        items: insertedItems,
        isOpen: false
      });

    } catch (error) {
      console.error("Error creating drawer:", error);
      toast({
        title: "Error",
        description: "Failed to create drawer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Fetch existing drawers when authenticated
  useEffect(() => {
    if (authState === 'authenticated') {
      fetchExistingDrawers();
    }
  }, [authState]);

  return {
    existingDrawers,
    isCreating,
    authState,
    retryCount: 0, // Simplified - no retry logic
    createDrawer,
    fetchExistingDrawers
  };
};
