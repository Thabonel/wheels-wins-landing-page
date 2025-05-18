// src/components/wheels/RVStorageOrganizer.tsx

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import DrawerSelector from "./DrawerSelector";

export default function RVStorageOrganizer() {
  const [storage, setStorage] = useState<any[]>([]);
  const [showList, setShowList] = useState(false);
  const [missingItems, setMissingItems] = useState<{ name: string; drawerName: string }[]>([]);
  const [checkedState, setCheckedState] = useState<{ [key: string]: boolean }>({});
  const [listId, setListId] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+1');
  const [showSMSPrompt, setShowSMSPrompt] = useState(false);

  const handleSendSMS = async () => {
    const fullNumber = `${countryCode}${phone.replace(/^0+/, '')}`;
    try {
      const res = await sendSMS(fullNumber, generateMessageText());
      toast({ title: "Sent!", description: "Check your phone." });
      setShowSMSPrompt(false);
      localStorage.setItem('userPhone', phone);
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const sendSMS = async (to: string, body: string) => {
    const res = await fetch("/api/send-sms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, body }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to send SMS");
    return data;
  };

  const generateMessageText = () => {
    return missingItems.map(item => `• ${item.name} (${item.drawerName})`).join('\n');
  };

  useEffect(() => {
    const saved = localStorage.getItem("userPhone");
    if (saved) setPhone(saved);

    fetch("https://ipapi.co/json/")
      .then(res => res.json())
      .then(data => {
        if (!saved && data?.country_calling_code) {
          setCountryCode(data.country_calling_code);
      }
      });

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

  const isDrawerComplete = (drawer: any) => {
    return drawer.items.every((i: any) => i.packed);
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

    const { data, error } = await supabase
      .from("shopping_lists")
      .insert([{ items: missing }])
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to save shopping list", variant: "destructive" });
      return;
    }

    setListId(data.id);
    setShowList(true);
  };

  const toggleCheckbox = (key: string) => {
    setCheckedState((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openOnPhone = () => {
    if (!listId) return;
    const url = `${window.location.origin}/shopping-list/${listId}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copied", description: "Open this on your phone." });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">RV Storage Organizer</h2>
      <div className="flex justify-end gap-2">
        <Button onClick={generateMissingItems}>Create Shopping List</Button>
        <DrawerSelector onDrawerCreated={(drawer) => setStorage((prev) => [...prev, drawer])} />
      </div>

      <div className="space-y-4">
        {storage.map((drawer) => {
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
                            <span className={`${item.packed ? "line-through text-gray-500" : ""}`}>{item.name}</span>
                          </label>
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

      <Dialog open={showList} onOpenChange={setShowList}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shopping List</DialogTitle>
          </DialogHeader>
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
          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={openOnPhone}>Open on Phone</Button>
            <Button className="bg-blue-500 text-white" onClick={() => setShowSMSPrompt(true)}>Send via SMS</Button>
            <Button onClick={() => setShowList(false)}>Close</Button>
          </DialogFooter>
          {showSMSPrompt && (
            <div className="flex flex-col gap-2 mt-4">
              <div className="relative flex items-center gap-2 mt-4 w-full">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="absolute left-0 top-0 h-full rounded-l border-r bg-gray-100 px-2 text-sm text-gray-600 opacity-0 w-0 overflow-hidden">
                  <option value="+1">🇺🇸 USA (+1)</option>
                  <option value="+44">🇬🇧 UK (+44)</option>
                  <option value="+61">🇦🇺 Australia (+61)</option>
                  <option value="+91">🇮🇳 India (+91)</option>
                </select>
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your phone number"
                  className="flex-1 border rounded px-4 py-2 w-full pl-16"
                />
              </div>
               <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setShowSMSPrompt(false)}>Cancel</Button>
                <Button onClick={handleSendSMS}>Send</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
