import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import DrawerSelector from "./DrawerSelector";

export default function RVStorageOrganizer() {
  const [storage, setStorage] = useState<any[]>([]);
  const [newItemNames, setNewItemNames] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    const fetchStorage = async () => {
      const { data, error } = await supabase
        .from("drawers")
        .select("id, name, photo_url, items(id, name, packed)");

      if (!error && data) {
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
    fetchStorage();
  }, []);

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

    await supabase.from("items").update({ packed: !item.packed }).eq("id", itemId);
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

  const deleteItem = async (drawerId: string, itemId: string) => {
    await supabase.from("items").delete().eq("id", itemId);
    setStorage((prev) =>
      prev.map((d) =>
        d.id === drawerId
          ? {
              ...d,
              items: d.items.filter((i: any) => i.id !== itemId),
            }
          : d
      )
    );
  };

  const addItem = async (drawerId: string) => {
    const name = newItemNames[drawerId]?.trim();
    if (!name) return;

    const { data, error } = await supabase
      .from("items")
      .insert([{ drawer_id: drawerId, name, packed: false }])
      .select();

    if (!error && data?.[0]) {
      setStorage((prev) =>
        prev.map((d) =>
          d.id === drawerId
            ? {
                ...d,
                items: [data[0], ...d.items],
              }
            : d
        )
      );
      setNewItemNames((prev) => ({ ...prev, [drawerId]: "" }));
    }
  };

  const isDrawerComplete = (drawer: any) => {
    return drawer.items?.every((i: any) => i.packed);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">RV Storage Organizer</h2>

      <div className="flex justify-end">
        <DrawerSelector onDrawerCreated={(drawer) => setStorage((prev) => [...prev, drawer])} />
      </div>

      <div className="space-y-4">
        {storage.map((drawer) => {
          const complete = isDrawerComplete(drawer);
          return (
            <Card
              key={drawer.id}
              className={`${complete ? "border-green-200" : "border-amber-200"}`}
            >
              <CardContent className="p-0">
                <div
                  className={`p-4 flex justify-between items-center ${
                    complete ? "bg-green-50" : "bg-amber-50"
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    {drawer.photo_url && (
                      <img
                        src={drawer.photo_url}
                        alt={drawer.name}
                        className="w-10 h-10 object-cover rounded"
                      />
                    )}
                    <div>
                      <span className="font-bold">{drawer.name}</span>
                      <p className="text-sm text-gray-600">
                        {drawer.items.filter((i: any) => i.packed).length} of {drawer.items.length} items packed
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => toggleDrawerState(drawer.id)}
                    variant="outline"
                    size="sm"
                  >
                    {drawer.isOpen ? "Close" : "Open"}
                  </Button>
                </div>

                {drawer.isOpen && (
                  <div className="p-4 pt-2 border-t space-y-4">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Add item name"
                        value={newItemNames[drawer.id] || ""}
                        onChange={(e) =>
                          setNewItemNames((prev) => ({ ...prev, [drawer.id]: e.target.value }))
                        }
                      />
                      <Button onClick={() => addItem(drawer.id)}>+ Add Item</Button>
                    </div>
                    <ul className="space-y-2">
                      {drawer.items.map((item: any) => (
                        <li key={item.id} className="flex items-center justify-between">
                          <label className="flex items-center w-full cursor-pointer">
                            <input
                              type="checkbox"
                              checked={item.packed}
                              onChange={() => toggleItemPacked(drawer.id, item.id)}
                              className="mr-3 h-5 w-5"
                            />
                            <span className={item.packed ? "line-through text-gray-500" : ""}>{item.name}</span>
                          </label>
                          <Button size="sm" variant="ghost" onClick={() => deleteItem(drawer.id, item.id)}>
                            ❌
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
