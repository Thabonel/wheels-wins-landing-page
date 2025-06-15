
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import DrawerSelector from "./DrawerSelector";
import DrawerList from "./storage/DrawerList";
import ShoppingListDialog from "./storage/ShoppingListDialog";
import { useStorageData } from "./storage/useStorageData";

export default function RVStorageOrganizer() {
  const [showList, setShowList] = useState(false);
  const { user, isAuthenticated } = useAuth();
  
  const {
    storage,
    missingItems,
    listId,
    handleDrawerCreated,
    toggleDrawerState,
    toggleItemPacked,
    generateMissingItems,
  } = useStorageData();

  const handleGenerateMissingItems = async () => {
    const success = await generateMissingItems();
    if (success) {
      setShowList(true);
    }
  };

  // Enhanced authentication check with better UX
  if (!isAuthenticated || !user) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">RV Storage Organizer</h2>
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">Please log in to manage your RV storage and create drawers.</p>
            <div className="text-sm text-gray-500 space-y-1">
              <p>• Create and organize storage drawers</p>
              <p>• Track packed and unpacked items</p>
              <p>• Generate shopping lists for missing items</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Transform storage data to ensure isOpen is always present
  const drawersWithOpenState = storage.map(drawer => ({
    ...drawer,
    isOpen: drawer.isOpen ?? false
  }));

  // Create wrapper function to match expected signature
  const handleToggleItem = (drawerId: string, itemId: string) => {
    // Find the item to get its current packed state
    const drawer = storage.find(d => d.id === drawerId);
    const item = drawer?.items.find(i => i.id === itemId);
    if (item) {
      toggleItemPacked(itemId, !item.packed);
    }
  };

  // Enhanced drawer creation handler with optimistic updates
  const handleDrawerCreatedWithUpdate = (drawer: any) => {
    console.log("New drawer created:", drawer);
    handleDrawerCreated(drawer);
    
    // Show success feedback
    if (drawer.items?.length > 0) {
      console.log(`Drawer created with ${drawer.items.length} preset items`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">RV Storage Organizer</h2>
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Debug: {storage.length} drawers loaded
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2">
        <Button 
          onClick={handleGenerateMissingItems}
          disabled={storage.length === 0}
          variant={storage.length === 0 ? "outline" : "default"}
        >
          Create Shopping List
          {storage.length === 0 && (
            <span className="ml-2 text-xs">(Add drawers first)</span>
          )}
        </Button>
        <DrawerSelector onDrawerCreated={handleDrawerCreatedWithUpdate} />
      </div>

      {storage.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Drawers Yet</h3>
            <p className="text-gray-600 mb-4">Get started by adding your first storage drawer.</p>
            <p className="text-sm text-gray-500">Choose from preset drawers or create your own custom drawer.</p>
          </div>
        </div>
      ) : (
        <DrawerList
          drawers={drawersWithOpenState}
          onToggleDrawer={toggleDrawerState}
          onToggleItem={handleToggleItem}
        />
      )}

      <ShoppingListDialog
        isOpen={showList}
        onClose={() => setShowList(false)}
        missingItems={missingItems}
        listId={listId}
      />
    </div>
  );
}
