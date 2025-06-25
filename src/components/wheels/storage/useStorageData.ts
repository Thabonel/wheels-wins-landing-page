
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

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

  useEffect(() => {
    const loadStorageData = async () => {
      if (!isAuthenticated || !user) {
        setLoading(false);
        return;
      }

      try {
        // Mock data for now - replace with actual API calls
        const mockData: StorageData = {
          items: [
            { id: '1', name: 'Rice', location: 'Pantry', category: 'Food', quantity: 2 },
            { id: '2', name: 'Spices Set', location: 'Upper Cabinet', category: 'Food', quantity: 1 },
            { id: '3', name: 'Towels', location: 'Bathroom Cabinet', category: 'Linens', quantity: 4 },
            { id: '4', name: 'Tools', location: 'External Left Bay', category: 'Tools', quantity: 1 }
          ],
          categories: ['Food', 'Linens', 'Tools', 'Clothing'],
          locations: ['Pantry', 'Upper Cabinet', 'Bathroom Cabinet', 'External Left Bay', 'External Right Bay']
        };

        setStorageData(mockData);
      } catch (error) {
        console.error('Error loading storage data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStorageData();
  }, [isAuthenticated, user]);

  const addItem = async (item: Omit<StorageItem, 'id'>) => {
    const newItem = {
      ...item,
      id: Date.now().toString()
    };
    setStorageData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateItem = async (id: string, updates: Partial<StorageItem>) => {
    setStorageData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === id ? { ...item, ...updates } : item
      )
    }));
  };

  const deleteItem = async (id: string) => {
    setStorageData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }));
  };

  return {
    storageData,
    loading,
    addItem,
    updateItem,
    deleteItem
  };
}
