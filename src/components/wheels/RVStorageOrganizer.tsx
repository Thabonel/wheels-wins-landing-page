
import { useState } from "react";
import { Button } from "@/components/ui/button";
import DrawerSelector from "./DrawerSelector";
import DrawerList from "./storage/DrawerList";
import ShoppingListDialog from "./storage/ShoppingListDialog";
import { useStorageData } from "./storage/useStorageData";

export default function RVStorageOrganizer() {
  const [showList, setShowList] = useState(false);
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

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">RV Storage Organizer</h2>
      <div className="flex justify-end gap-2">
        <Button onClick={handleGenerateMissingItems}>Create Shopping List</Button>
        <DrawerSelector onDrawerCreated={handleDrawerCreated} />
      </div>

      <DrawerList
        drawers={storage}
        onToggleDrawer={toggleDrawerState}
        onToggleItem={toggleItemPacked}
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
