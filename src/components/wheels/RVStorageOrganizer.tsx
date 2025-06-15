
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

  // Show authentication message if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">RV Storage Organizer</h2>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Please log in to manage your RV storage.</p>
          <p className="text-sm text-gray-500">You need to be authenticated to create and manage drawers.</p>
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">RV Storage Organizer</h2>
      <div className="flex justify-end gap-2">
        <Button onClick={handleGenerateMissingItems}>Create Shopping List</Button>
        <DrawerSelector onDrawerCreated={handleDrawerCreated} />
      </div>

      <DrawerList
        drawers={drawersWithOpenState}
        onToggleDrawer={toggleDrawerState}
        onToggleItem={handleToggleItem}
      />

      <ShoppingListDialog
        isOpen={showList}
        onClose={() => setShowList(false)}
        missingItems={missingItems}
        listId={listId}
      />
    </div>
  );
}
