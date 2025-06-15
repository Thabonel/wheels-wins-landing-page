
import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { presetDrawers } from './drawer-selector/constants';
import { useDrawerOperations } from './drawer-selector/useDrawerOperations';
import NewDrawerModal from './drawer-selector/NewDrawerModal';

interface DrawerSelectorProps {
  onDrawerCreated: (drawer: any) => void;
}

const DrawerSelector: React.FC<DrawerSelectorProps> = ({ onDrawerCreated }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const { existingDrawers, isCreating, createDrawer } = useDrawerOperations(onDrawerCreated);

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

  const handleModalSave = async (name: string) => {
    await createDrawer(name);
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

      <NewDrawerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleModalSave}
        existingDrawers={existingDrawers}
        isCreating={isCreating}
      />
    </>
  );
};

export default DrawerSelector;
