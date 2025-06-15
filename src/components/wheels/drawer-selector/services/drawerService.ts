
import { supabase } from "@/integrations/supabase";
import { drawerItems } from '../constants';

export const createDrawerWithItems = async (name: string) => {
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
    throw drawerError;
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
      // Don't throw error for items insertion failure, drawer was created successfully
    } else {
      insertedItems = itemsData || [];
    }
  }

  return {
    drawer: drawerData,
    items: insertedItems,
    hasPresetItems: !!itemsToAdd
  };
};
