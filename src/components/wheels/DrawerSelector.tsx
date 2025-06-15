
import React, { useState, useEffect } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase";
import { Loader2 } from "lucide-react";

interface DrawerSelectorProps {
  onDrawerCreated: (drawer: any) => void;
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
  const [isCreating, setIsCreating] = useState(false);
  const [existingDrawers, setExistingDrawers] = useState<string[]>([]);
  const { toast } = useToast();

  // Fetch existing drawer names on component mount
  useEffect(() => {
    fetchExistingDrawers();
  }, []);

  const fetchExistingDrawers = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) return;

      const { data, error } = await supabase
        .from('drawers')
        .select('name')
        .eq('user_id', userData.user.id);

      if (error) {
        console.error("Error fetching existing drawers:", error);
        return;
      }

      setExistingDrawers(data?.map(d => d.name.toLowerCase()) || []);
    } catch (error) {
      console.error("Error in fetchExistingDrawers:", error);
    }
  };

  const validateDrawerName = (name: string): string | null => {
    if (!name.trim()) {
      return "Drawer name cannot be empty.";
    }
    
    if (name.trim().length < 2) {
      return "Drawer name must be at least 2 characters long.";
    }
    
    if (name.trim().length > 50) {
      return "Drawer name cannot exceed 50 characters.";
    }
    
    if (existingDrawers.includes(name.trim().toLowerCase())) {
      return "A drawer with this name already exists.";
    }
    
    return null;
  };

  const handlePresetSelect = async (name: string) => {
    setIsDropdownOpen(false);
    
    // Check for duplicates
    if (existingDrawers.includes(name.toLowerCase())) {
      toast({
        title: "Drawer Already Exists",
        description: `You already have a drawer named "${name}".`,
        variant: "destructive",
      });
      return;
    }
    
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
    const validationError = validateDrawerName(newDrawerName);
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }
    
    await createDrawer(newDrawerName.trim());
    handleModalClose();
  };

  const createDrawer = async (name: string) => {
    setIsCreating(true);
    console.log("Creating drawer:", name);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        toast({
          title: "Authentication Error",
          description: "Could not get user information. Please log in again.",
          variant: "destructive",
        });
        return;
      }

      const userId = userData.user.id;
      
      // Create the drawer
      const { data: drawerData, error: drawerError } = await supabase
        .from('drawers')
        .insert([{ name: name, photo_url: "", user_id: userId }])
        .select()
        .single();

      if (drawerError) {
        console.error("Error creating drawer:", drawerError);
        
        // Handle specific error cases
        if (drawerError.code === '23505') {
          toast({
            title: "Duplicate Drawer",
            description: "A drawer with this name already exists.",
            variant: "destructive",
          });
        } else if (drawerError.code === '42501') {
          toast({
            title: "Permission Error",
            description: "You don't have permission to create drawers. Please try logging in again.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Error",
            description: `Failed to create drawer: ${drawerError.message}`,
            variant: "destructive",
          });
        }
        return;
      }

      // Create preset items if available
      const itemsToAdd = drawerItems[name];
      let insertedItems: any[] = [];
      
      if (itemsToAdd && drawerData) {
        const itemsToInsert = itemsToAdd.map(item => ({
          name: item,
          packed: false,
          drawer_id: drawerData.id,
          quantity: 1
        }));

        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .insert(itemsToInsert)
          .select();

        if (itemsError) {
          console.error("Error inserting preset items:", itemsError);
          toast({
            title: "Warning",
            description: "Drawer created but some preset items couldn't be added.",
          });
        } else {
          insertedItems = itemsData || [];
        }
      }

      // Update local state
      setExistingDrawers(prev => [...prev, name.toLowerCase()]);
      
      // Success notification
      toast({
        title: "Success",
        description: `${name} drawer created successfully${itemsToAdd ? ` with ${itemsToAdd.length} preset items` : ''}.`,
      });

      // Notify parent component
      onDrawerCreated?.({ 
        ...drawerData, 
        items: insertedItems 
      });

    } catch (error) {
      console.error("Unexpected error creating drawer:", error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={isCreating}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "+ Add Drawer"
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleNewDrawerClick}>
            New Drawer
          </DropdownMenuItem>
          {presetDrawers.map((drawerName) => {
            const isDisabled = existingDrawers.includes(drawerName.toLowerCase());
            return (
              <DropdownMenuItem 
                key={drawerName} 
                onClick={() => !isDisabled && handlePresetSelect(drawerName)}
                disabled={isDisabled}
                className={isDisabled ? "opacity-50 cursor-not-allowed" : ""}
              >
                {drawerName} {isDisabled && "(Already exists)"}
              </DropdownMenuItem>
            );
          })}
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
              maxLength={50}
            />
            <p className="text-sm text-gray-500 mt-2">
              {newDrawerName.length}/50 characters
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleModalClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleSaveNewDrawer} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DrawerSelector;
