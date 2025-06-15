
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import DrawerSelector from "./DrawerSelector";

export default function RVStorageOrganizer() {
  const [storage, setStorage] = useState<any[]>([]);
  const [showList, setShowList] = useState(false);
  const [missingItems, setMissingItems] = useState<{ name: string; drawerName: string }[]>([]);
  const [checkedState, setCheckedState] = useState<{ [key: string]: boolean }>({});
  const [listId, setListId] = useState<string | null>(null);

  useEffect(() => {
    fetchStorage();
  }, []);

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

  const isDrawerComplete = (drawer: any) => {
    return drawer.items.length > 0 && drawer.items.every((i: any) => i.packed);
  };

  const generateMissingItems = async () => {
    const missing: { name: string; drawerName: string }[] = [];
    storage.forEach((drawer) => {
      drawer.items.forEach((item: any) => {
        if (!item.packed) {
          missing.push({ name: item.name, drawerName: drawer.name });
        }
      });
    });
    setMissingItems(missing);
    setCheckedState({});

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
    setShowList(true);
  };

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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">RV Storage Organizer</h2>
      <div className="flex justify-end gap-2">
        <Button onClick={generateMissingItems}>Create Shopping List</Button>
        <DrawerSelector onDrawerCreated={handleDrawerCreated} />
      </div>

      <div className="space-y-4">
        {storage.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500 mb-4">No drawers created yet</p>
              <p className="text-sm text-gray-400">Use the "Add Drawer" button above to get started</p>
            </CardContent>
          </Card>
        ) : (
          storage.map((drawer) => {
            const complete = isDrawerComplete(drawer);
            return (
              <Card key={drawer.id} className={`${complete ? "border-green-200" : "border-amber-200"}`}>
                <CardContent className="p-0">
                  <div className={`p-4 flex justify-between items-center ${complete ? "bg-green-50" : "bg-amber-50"}`}>
                    <div className="flex items-center space-x-4">
                      {drawer.photo_url && (
                        <img src={drawer.photo_url} alt={drawer.name} className="w-10 h-10 object-cover rounded" />
                      )}
                      <div>
                        <span className="font-bold">{drawer.name}</span>
                        <p className="text-sm text-gray-600">
                          {drawer.items.filter((i: any) => i.packed).length} of {drawer.items.length} items packed
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => toggleDrawerState(drawer.id)} variant="outline" size="sm">
                      {drawer.isOpen ? "Close" : "Open"}
                    </Button>
                  </div>
                  {drawer.isOpen && (
                    <div className="p-4 pt-2 border-t">
                      {drawer.items.length === 0 ? (
                        <p className="text-gray-500 text-sm">No items in this drawer</p>
                      ) : (
                        <ul className="space-y-2">
                          {drawer.items.map((item: any) => (
                            <li key={item.id} className="flex items-center">
                              <label className="flex items-center w-full cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.packed}
                                  onChange={() => toggleItemPacked(drawer.id, item.id)}
                                  className="mr-3 h-5 w-5"
                                />
                                <span className={`${item.packed ? "line-through text-gray-500" : ""}`}>
                                  {item.name}
                                  {item.quantity && item.quantity > 1 && (
                                    <span className="text-gray-400 ml-2">x{item.quantity}</span>
                                  )}
                                </span>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={showList} onOpenChange={setShowList}>
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
            <Button onClick={() => setShowList(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
