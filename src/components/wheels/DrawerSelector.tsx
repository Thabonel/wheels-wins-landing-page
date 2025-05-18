import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase";

interface DrawerSelectorProps {
  onDrawerCreated: (drawer: any) => void; // Define the prop type
}

const presetDrawers = [
  "Kitchen Drawer",
  "Bathroom Cabinet",
  "Under Bed Storage",
  "Exterior Compartment",
  "Fridge",
  "Pantry",
  "Closet",
  "Overhead Storage",
  "Laundry Area"
];

const drawerItems: Record<string, string[]> = {
  "Kitchen Drawer": ["Utensils", "Plates", "Bowls", "Cups", "Pots", "Pans"],
  "Bathroom Cabinet": ["Toiletries", "Medicine", "Towels", "Cleaning Supplies"],
  "Under Bed Storage": ["Clothing", "Books", "Seasonal Items"],
  "Exterior Compartment": ["Tools", "Hoses", "Cables", "Grill", "Chairs"],
  "Fridge": ["Produce", "Dairy", "Meat", "Beverages"],
  "Pantry": ["Canned Goods", "Dry Goods", "Snacks", "Spices"],
  "Closet": ["Clothing", "Shoes", "Hangers"],
  "Overhead Storage": ["Bedding", "Jackets", "Games"],
  "Laundry Area": ["Detergent", "Fabric Softener", "Hampers"]
};




const DrawerSelector: React.FC<DrawerSelectorProps> = ({ onDrawerCreated }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newDrawerName, setNewDrawerName] = useState("");
  const { toast } = useToast();

  const handlePresetSelect = async (name: string) => {
    setIsDropdownOpen(false);
    await createDrawer(name);
  };

  const handleNewDrawerClick = () => {
    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setNewDrawerName("");
  };

  const handleSaveNewDrawer = async () => {
    if (!newDrawerName.trim()) {
      toast({
        title: "Error",
        description: "Drawer name cannot be empty.",
        variant: "destructive",
      });
      return;
    }
    await createDrawer(newDrawerName.trim());
    handleModalClose();
  };

  const createDrawer = async (name: string) => {
    console.log("Creating drawer:", name);

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user) {
      toast({
        title: "Error",
        description: "Could not get user information. Please log in again.",
        variant: "destructive",
      });
      return;
    }

    const userId = userData.user.id;
    const { data, error } = await supabase
      .from('drawers') // Assuming your table name is 'drawers'
      .insert([{ name: name, photo_url: "", user_id: userId }])
      .select()
      .single();

    if (error) {
      console.log("Insert result:", { data, error });
      console.error("Error creating drawer:", error);
      toast({
        title: "Error",
        description: "Failed to create drawer.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `${name} drawer created.`,
      });

      const itemsToAdd = drawerItems[name];
      let insertedItems: any[] = [];
      if (itemsToAdd && data) {
        const itemsToInsert = itemsToAdd.map(item => ({
          name: item,
          packed: false,
          drawer_id: data.id // Use the ID of the newly created drawer
        }));

        const { data: itemsData, error: itemsError } = await supabase
          .from('items') // Assuming your table name for items is 'items'
          .insert(itemsToInsert)
          .select(); // Select the inserted items to return them

        if (itemsError) {
          console.error("Error inserting preset items:", itemsError);
        } else {
          insertedItems = itemsData || [];
        }
      }
      onDrawerCreated?.({ ...data, items: insertedItems });


    }
  };

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">+ Add Drawer</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleNewDrawerClick}>
            New Drawer
          </DropdownMenuItem>
          {presetDrawers.map((drawerName) => (
            <DropdownMenuItem key={drawerName} onClick={() => handlePresetSelect(drawerName)}>
              {drawerName}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Drawer</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter drawer name"
              value={newDrawerName}
              onChange={(e) => setNewDrawerName(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleModalClose}>Cancel</Button>
            <Button onClick={handleSaveNewDrawer}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DrawerSelector;