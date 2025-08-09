
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/common/AnimatedDialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { useState } from "react";

interface MissingItem {
  name: string;
  drawerName: string;
}

interface ShoppingListDialogProps {
  isOpen: boolean;
  onClose: () => void;
  missingItems: MissingItem[];
  listId: string | null;
}

const ShoppingListDialog: React.FC<ShoppingListDialogProps> = ({
  isOpen,
  onClose,
  missingItems,
  listId
}) => {
  const [checkedState, setCheckedState] = useState<{ [key: string]: boolean }>({});

  const toggleCheckbox = (key: string) => {
    setCheckedState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openOnPhone = () => {
    if (!listId) {
      console.log("No list ID available");
      return;
    }
    const url = `${window.location.origin}/shopping-list/${listId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast({ title: "Link copied", description: "Open this on your phone." });
    }).catch(err => {
      console.error("Clipboard error:", err);
      toast({ title: "Clipboard error", description: err.message, variant: "destructive" });
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Shopping List</DialogTitle>
        </DialogHeader>
        {missingItems.length === 0 ? (
          <p className="text-center text-gray-500">No unpacked items found.</p>
        ) : (
          <ul className="space-y-2">
            {missingItems.map((item, i) => {
              const key = `${item.drawerName}-${item.name}`;
              return (
                <li key={i} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={!!checkedState[key]}
                    onChange={() => toggleCheckbox(key)}
                    className="mr-2"
                  />
                  <span className={checkedState[key] ? "line-through text-gray-400" : ""}>
                    {item.name} ({item.drawerName})
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={openOnPhone}>Open on Phone</Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShoppingListDialog;
