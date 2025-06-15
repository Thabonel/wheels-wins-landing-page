
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase";
import { toast } from "@/components/ui/use-toast";

interface DrawerItem {
  id: string;
  name: string;
  packed: boolean;
  quantity?: number;
}

interface Drawer {
  id: string;
  name: string;
  photo_url?: string;
  isOpen: boolean;
  items: DrawerItem[];
}

interface MissingItem {
  name: string;
  drawerName: string;
}

export const useStorageData = () => {
  const [storage, setStorage] = useState<Drawer[]>([]);
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [listId, setListId] = useState<string | null>(null);

  const fetchStorage = async () => {
    console.log("Fetching storage data from Supabase...");
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      toast({
        title: "Error",
        description: "Please log in to view your storage.",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("drawers")
      .select(`
        id,
        name,
        photo_url,
        items (
          id,
          name,
          packed,
          quantity
        )
      `)
      .eq('user_id', userData.user.id);

    if (error) {
      console.error("Error fetching storage:", error);
      toast({
        title: "Error",
        description: "Failed to load storage data.",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      console.log("Storage data loaded:", data);
      setStorage(
        data.map((d) => ({
          id: d.id,
          name: d.name,
          photo_url: d.photo_url,
          isOpen: false,
          items: d.items || [],
        }))
      );
    }
  };

  const handleDrawerCreated = (newDrawer: any) => {
    console.log("New drawer created:", newDrawer);
    setStorage((prev) => [...prev, {
      ...newDrawer,
      isOpen: false
    }]);
  };

  const toggleDrawerState = (id: string) => {
    setStorage((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isOpen: !d.isOpen } : d))
    );
  };

  const toggleItemPacked = async (drawerId: string, itemId: string) => {
    const drawer = storage.find((d) => d.id === drawerId);
    if (!drawer) return;

    const item = drawer.items.find((i: any) => i.id === itemId);
    if (!item) return;

    const { error } = await supabase
      .from("items")
      .update({ packed: !item.packed })
      .eq("id", itemId);

    if (error) {
      console.error("Error updating item:", error);
      toast({
        title: "Error",
        description: "Failed to update item status.",
        variant: "destructive",
      });
      return;
    }

    setStorage((prev) =>
      prev.map((d) =>
        d.id === drawerId
          ? {
              ...d,
              items: d.items.map((i: any) =>
                i.id === itemId ? { ...i, packed: !i.packed } : i
              ),
            }
          : d
      )
    );
  };

  const generateMissingItems = async () => {
    const missing: MissingItem[] = [];
    storage.forEach((drawer) => {
      drawer.items.forEach((item: any) => {
        if (!item.packed) {
          missing.push({ name: item.name, drawerName: drawer.name });
        }
      });
    });
    setMissingItems(missing);

    if (missing.length === 0) {
      toast({
        title: "All packed!",
        description: "All items are already packed.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("shopping_lists")
      .insert([{ items: missing }])
      .select()
      .single();

    if (error) {
      console.error("Error creating shopping list:", error);
      toast({ 
        title: "Error", 
        description: "Failed to save shopping list", 
        variant: "destructive" 
      });
      return;
    }

    setListId(data.id);
    return true; // Indicate success for opening dialog
  };

  useEffect(() => {
    fetchStorage();
  }, []);

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
