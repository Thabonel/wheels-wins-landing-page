
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase";
import { useToast } from "@/components/ui/use-toast";
import { drawerItems } from './constants';

export const useDrawerOperations = (onDrawerCreated?: (drawer: any) => void) => {
  const [existingDrawers, setExistingDrawers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [authState, setAuthState] = useState<'checking' | 'authenticated' | 'unauthenticated'>('checking');
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // Enhanced auth state monitoring
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Auth session error:", error);
          setAuthState('unauthenticated');
          return;
        }
        
        if (session?.user) {
          console.log("User authenticated:", session.user.id);
          setAuthState('authenticated');
        } else {
          console.log("No authenticated user found");
          setAuthState('unauthenticated');
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setAuthState('unauthenticated');
      }
    };

    checkAuthState();

    // Monitor auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, "Session:", !!session);
      setAuthState(session?.user ? 'authenticated' : 'unauthenticated');
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchExistingDrawers = async () => {
    if (authState !== 'authenticated') {
      console.log("Cannot fetch drawers - user not authenticated");
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.error("Failed to get user data:", userError);
        setAuthState('unauthenticated');
        return;
      }

      console.log("Fetching drawers for user:", userData.user.id);

      // Enhanced query with better error handling
      const { data, error } = await supabase
        .from('drawers')
        .select('name')
        .eq('user_id', userData.user.id);

      if (error) {
        console.error("Error fetching existing drawers:", error);
        
        // Provide specific error handling
        if (error.code === '42501') {
          toast({
            title: "Permission Error",
            description: "Unable to access your drawers. Please try refreshing the page or contact support.",
            variant: "destructive",
          });
        }
        return;
      }

      console.log("Fetched drawers:", data);
      setExistingDrawers(data?.map(d => d.name.toLowerCase()) || []);
    } catch (error) {
      console.error("Unexpected error in fetchExistingDrawers:", error);
    }
  };

  const createDrawerWithRetry = async (name: string, attempt: number = 1): Promise<boolean> => {
    const maxRetries = 3;
    
    try {
      console.log(`Creating drawer attempt #${attempt}:`, name);
      
      // Enhanced auth validation
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        console.error("Authentication failed:", userError);
        toast({
          title: "Authentication Required",
          description: "Please log in again to create drawers.",
          variant: "destructive",
        });
        return false;
      }

      const userId = userData.user.id;
      console.log("Creating drawer for authenticated user:", userId);
      
      // Enhanced drawer payload with validation
      const drawerPayload = { 
        name: name.trim(), 
        photo_url: "", 
        user_id: userId 
      };
      
      console.log("Drawer payload (attempt #" + attempt + "):", drawerPayload);

      // Enhanced insert with better error handling
      const { data: drawerData, error: drawerError } = await supabase
        .from('drawers')
        .insert([drawerPayload])
        .select()
        .single();

      if (drawerError) {
        console.error(`Drawer creation error (attempt #${attempt}):`, drawerError);
        
        // Enhanced error handling with retry logic
        if (drawerError.code === '42501' && attempt < maxRetries) {
          console.log(`Retrying drawer creation (attempt #${attempt + 1})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          return createDrawerWithRetry(name, attempt + 1);
        }
        
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
            description: "Unable to create drawer due to permission issues. Please try refreshing the page or contact support.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: `Failed to create drawer: ${drawerError.message}`,
            variant: "destructive",
          });
        }
        return false;
      }

      console.log("Drawer created successfully:", drawerData);

      // Create preset items if available
      const itemsToAdd = drawerItems[name];
      let insertedItems: any[] = [];
      
      if (itemsToAdd && drawerData) {
        console.log("Adding preset items:", itemsToAdd);
        
        const itemsToInsert = itemsToAdd.map(item => ({
          name: item,
          packed: false,
          drawer_id: drawerData.id,
          quantity: 1
        }));

        console.log("Items to insert:", itemsToInsert);

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
          console.log("Items inserted successfully:", insertedItems);
        }
      }

      // Update local state with optimistic update
      setExistingDrawers(prev => [...prev, name.toLowerCase()]);
      setRetryCount(0); // Reset retry count on success
      
      // Success notification
      toast({
        title: "Success",
        description: `${name} drawer created successfully${itemsToAdd ? ` with ${itemsToAdd.length} preset items` : ''}.`,
      });

      // Notify parent component
      onDrawerCreated?.({ 
        ...drawerData, 
        items: insertedItems,
        isOpen: false // Ensure isOpen property is set
      });

      return true;

    } catch (error) {
      console.error(`Unexpected error creating drawer (attempt #${attempt}):`, error);
      
      if (attempt < maxRetries) {
        console.log(`Retrying due to unexpected error (attempt #${attempt + 1})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return createDrawerWithRetry(name, attempt + 1);
      }
      
      toast({
        title: "Network Error",
        description: "Unable to create drawer due to connection issues. Please try again.",
        variant: "destructive",
      });
      return false;
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
    setRetryCount(prev => prev + 1);
    
    console.log("=== DRAWER CREATION DEBUG INFO ===");
    console.log("Auth State:", authState);
    console.log("Retry Count:", retryCount);
    console.log("Drawer Name:", name);
    console.log("Existing Drawers:", existingDrawers);
    
    const success = await createDrawerWithRetry(name);
    
    if (success) {
      console.log("Drawer creation completed successfully");
    } else {
      console.log("Drawer creation failed after all retries");
    }
    
    setIsCreating(false);
  };

  // Enhanced initialization
  useEffect(() => {
    if (authState === 'authenticated') {
      fetchExistingDrawers();
    }
  }, [authState]);

  return {
    existingDrawers,
    isCreating,
    authState,
    retryCount,
    createDrawer,
    fetchExistingDrawers
  };
};
