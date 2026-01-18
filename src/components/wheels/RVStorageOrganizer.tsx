import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2 } from "lucide-react";
import { useAuth } from '@/context/AuthContext';
import { useStorageData } from './storage/useStorageData';
import DrawerSelector from './DrawerSelector';
import DrawerList from './storage/DrawerList';
import { useDrawerOperations } from './drawer-selector/useDrawerOperations';
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
const RVStorageOrganizer = () => {
  const {
    isAuthenticated
  } = useAuth();
  const {
    storageData,
    loading,
    addItem,
    updateItem,
    deleteItem
  } = useStorageData();
  const {
    deleteDrawer
  } = useDrawerOperations(undefined, handleDrawerDeleted);
  const [searchTerm, setSearchTerm] = useState('');
  const [drawers, setDrawers] = useState<Drawer[]>([]);

  // Transform storage data into drawer format
  useEffect(() => {
    if (storageData.items && storageData.locations) {
      const drawerMap = new Map<string, Drawer>();

      // Initialize drawers from locations
      storageData.locations.forEach(location => {
        drawerMap.set(location, {
          id: location.toLowerCase().replace(/\s+/g, '-'),
          name: location,
          photo_url: undefined,
          isOpen: false,
          items: []
        });
      });

      // Group items by location
      storageData.items.forEach(item => {
        const drawer = drawerMap.get(item.location);
        if (drawer) {
          drawer.items.push({
            id: item.id,
            name: item.name,
            packed: false,
            // Storage items don't have packed status, defaulting to false
            quantity: item.quantity
          });
        }
      });
      setDrawers(Array.from(drawerMap.values()));
    }
  }, [storageData]);
  const handleToggleDrawer = (drawerId: string) => {
    setDrawers(prev => prev.map(drawer => drawer.id === drawerId ? {
      ...drawer,
      isOpen: !drawer.isOpen
    } : drawer));
  };
  const handleToggleItem = async (drawerId: string, itemId: string) => {
    // For storage items, we don't have a "packed" concept, but we can toggle for UI consistency
    setDrawers(prev => prev.map(drawer => drawer.id === drawerId ? {
      ...drawer,
      items: drawer.items.map(item => item.id === itemId ? {
        ...item,
        packed: !item.packed
      } : item)
    } : drawer));
  };
  const handleDeleteDrawer = async (name: string) => {
    await deleteDrawer(name);
    window.location.reload();
  };
  const handleDrawerCreated = (newDrawer: any) => {
    // Refresh data when a new drawer is created
    window.location.reload(); // Simple refresh for now
  };
  function handleDrawerDeleted(deletedDrawer: any) {
    window.location.reload();
  }
  const filteredDrawers = drawers.filter(drawer => drawer.name.toLowerCase().includes(searchTerm.toLowerCase()) || drawer.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())));
  if (!isAuthenticated) {
    return <Card>
        <CardHeader>
          <CardTitle>RV Storage Organizer</CardTitle>
          <CardDescription>Please sign in to manage your RV storage.</CardDescription>
        </CardHeader>
      </Card>;
  }
  if (loading) {
    return <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Storage Data...
          </CardTitle>
          <CardDescription>Retrieving your RV storage information</CardDescription>
        </CardHeader>
      </Card>;
  }
  return <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          
          <p className="text-muted-foreground">Keep track of your belongings and storage locations</p>
        </div>
        <DrawerSelector onDrawerCreated={handleDrawerCreated} onDrawerDeleted={handleDrawerDeleted} />
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
      </div>

      {/* Storage Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Storage Areas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{drawers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Items</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">
              {drawers.reduce((total, drawer) => total + drawer.items.length, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Categories</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold">{storageData.categories.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Storage Areas Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredDrawers.slice(0, 6).map(drawer => {
        const isComplete = drawer.items.length > 0 && drawer.items.every(item => item.packed);
        return <Card key={drawer.id} className={isComplete ? "border-green-200" : "border-gray-200"}>
              <CardHeader>
                <CardTitle>
                  {drawer.name}
                </CardTitle>
                <CardDescription>
                  {drawer.items.length === 0 ? "No items stored" : `${drawer.items.length} item${drawer.items.length === 1 ? '' : 's'} stored`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {drawer.items.length > 0 ? <div className="space-y-2">
                    {drawer.items.slice(0, 3).map(item => <div key={item.id} className="flex justify-between items-center">
                        <span className="text-sm">{item.name} {item.quantity && item.quantity > 1 && `(${item.quantity})`}</span>
                        <Badge variant="outline">{drawer.name}</Badge>
                      </div>)}
                    {drawer.items.length > 3 && <div className="text-sm text-muted-foreground">
                        +{drawer.items.length - 3} more items
                      </div>}
                  </div> : <div className="text-sm text-muted-foreground">
                    No items in this storage area
                  </div>}
              </CardContent>
            </Card>;
      })}
      </div>

      {/* Detailed Drawer List */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Storage Management</CardTitle>
          <CardDescription>
            Manage individual storage areas and their contents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DrawerList drawers={filteredDrawers} onToggleDrawer={handleToggleDrawer} onToggleItem={handleToggleItem} onDeleteDrawer={handleDeleteDrawer} />
        </CardContent>
      </Card>
    </div>;
};
export default RVStorageOrganizer;