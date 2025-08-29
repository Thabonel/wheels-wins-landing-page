
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface StorageItem {
  id: string;
  name: string;
  location: string;
  category: string;
  quantity: number;
}

interface StorageData {
  items: StorageItem[];
  categories: string[];
  locations: string[];
}

export function useStorageData() {
  const { isAuthenticated, user } = useAuth();
  const [storageData, setStorageData] = useState<StorageData>({
    items: [],
    categories: [],
    locations: []
  });
  const [loading, setLoading] = useState(true);

  const loadStorageData = async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

      try {
        const userId = user.id;

        const [itemsRes, catRes, locRes] = await Promise.all([
          supabase.from('storage_items').select('*').eq('user_id', userId),
          supabase.from('storage_categories').select('*').eq('user_id', userId),
          supabase.from('storage_locations').select('*').eq('user_id', userId)
        ]);

        if (itemsRes.error) throw itemsRes.error;
        if (catRes.error) throw catRes.error;
        if (locRes.error) throw locRes.error;

        const categoriesMap = new Map((catRes.data || []).map(c => [c.id, c.name]));
        const locationsMap = new Map((locRes.data || []).map(l => [l.id, l.name]));

        const items: StorageItem[] = (itemsRes.data || []).map(i => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity || 0,
          category: categoriesMap.get(i.category_id) || '',
          location: locationsMap.get(i.location_id) || ''
        }));

        setStorageData({
          items,
          categories: Array.from(categoriesMap.values()),
          locations: Array.from(locationsMap.values())
        });
      } catch (error) {
        console.error('Error loading storage data:', error);
      } finally {
        setLoading(false);
      }
  };

  useEffect(() => {
    loadStorageData();
  }, [isAuthenticated, user]);

  const getCategoryId = async (name: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('storage_categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .single();
    if (error || !data) {
      const { data: inserted, error: insertError } = await supabase
        .from('storage_categories')
        .insert({ user_id: user.id, name })
        .select()
        .single();
      if (insertError || !inserted) throw insertError;
      return inserted.id;
    }
    return data.id;
  };

  const getLocationId = async (name: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('storage_locations')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .single();
    if (error || !data) {
      const { data: inserted, error: insertError } = await supabase
        .from('storage_locations')
        .insert({ user_id: user.id, name })
        .select()
        .single();
      if (insertError || !inserted) throw insertError;
      return inserted.id;
    }
    return data.id;
  };

  const addItem = async (item: Omit<StorageItem, 'id'>) => {
    if (!user) return;
    try {
      const category_id = await getCategoryId(item.category);
      const location_id = await getLocationId(item.location);
      await supabase.from('storage_items').insert({
        user_id: user.id,
        name: item.name,
        quantity: item.quantity,
        category_id,
        location_id
      });
      await loadStorageData();
    } catch (error) {
      console.error('Add item failed:', error);
    }
  };

  const updateItem = async (id: string, updates: Partial<StorageItem>) => {
    if (!user) return;
    try {
      const payload: any = {};
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.quantity !== undefined) payload.quantity = updates.quantity;
      if (updates.category !== undefined) {
        payload.category_id = await getCategoryId(updates.category);
      }
      if (updates.location !== undefined) {
        payload.location_id = await getLocationId(updates.location);
      }
      await supabase
        .from('storage_items')
        .update(payload)
        .eq('id', id)
        .eq('user_id', user.id);
      await loadStorageData();
    } catch (error) {
      console.error('Update item failed:', error);
    }
  };

  const deleteItem = async (id: string) => {
    if (!user) return;
    try {
      await supabase
        .from('storage_items')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      await loadStorageData();
    } catch (error) {
      console.error('Delete item failed:', error);
    }
  };

  return {
    storageData,
    loading,
    addItem,
    updateItem,
    deleteItem
  };
}
