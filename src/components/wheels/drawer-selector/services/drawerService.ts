
import { supabase } from "@/integrations/supabase/client";
import { drawerItems } from '../constants';

export const createDrawerWithItems = async (name: string) => {
  console.log('🎯 Starting drawer creation for:', name);
  
  // Get current user
  const { data: userData, error: userError } = await supabase.auth.getUser();
  console.log('👤 Current user data:', userData?.user?.id, 'Error:', userError);
  
  if (userError || !userData?.user) {
    console.error('❌ Authentication failed:', userError);
    throw new Error("Authentication failed");
  }

  const userId = userData.user.id;
  console.log('🔑 Using user ID:', userId);
  
  // Create drawer with explicit user_id
  const drawerData = {
    name: name.trim(),
    photo_url: "",
    user_id: userId
  };
  
  console.log('📦 Creating drawer with data:', drawerData);
  
  const { data: insertedDrawer, error: drawerError } = await supabase
    .from('drawers')
    .insert([drawerData])
    .select()
    .single();

  if (drawerError) {
    console.error('❌ Drawer creation error:', drawerError);
    throw drawerError;
  }

  console.log('✅ Drawer created successfully:', insertedDrawer);

  // Create preset items if available
  const itemsToAdd = drawerItems[name];
  let insertedItems: any[] = [];
  
  if (itemsToAdd && insertedDrawer) {
    console.log('📝 Adding preset items:', itemsToAdd);
    
    const itemsToInsert = itemsToAdd.map(item => ({
      name: item,
      packed: false,
      drawer_id: insertedDrawer.id,
      quantity: 1
    }));

    const { data: itemsData, error: itemsError } = await supabase
      .from('items')
      .insert(itemsToInsert)
      .select();

    if (itemsError) {
      console.error("⚠️ Error inserting preset items:", itemsError);
      // Don't throw error for items insertion failure, drawer was created successfully
    } else {
      insertedItems = itemsData || [];
      console.log('✅ Items created successfully:', insertedItems.length);
    }
  }

  return {
    drawer: insertedDrawer,
    items: insertedItems,
    hasPresetItems: !!itemsToAdd
  };
};
