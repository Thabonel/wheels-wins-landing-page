
import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle, Plus, Trash2 } from "lucide-react";
import { presetDrawers } from './drawer-selector/constants';
import { useDrawerOperations } from './drawer-selector/useDrawerOperations';
import NewDrawerModal from './drawer-selector/NewDrawerModal';

interface DrawerSelectorProps {
  onDrawerCreated: (drawer: any) => void;
  onDrawerDeleted?: (drawer: any) => void;
}

const DrawerSelector: React.FC<DrawerSelectorProps> = ({ onDrawerCreated, onDrawerDeleted }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { toast } = useToast();

  const {
    existingDrawers,
    isCreating,
    isDeleting,
    authState,
    createDrawer,
    deleteDrawer,
  } = useDrawerOperations(onDrawerCreated, onDrawerDeleted);

  const handlePresetSelect = async (name: string) => {
    setIsDropdownOpen(false);
    
    if (authState !== 'authenticated') {
      toast({
        title: "Authentication Required",
        description: "Please log in to create drawers.",
        variant: "destructive",
      });
      return;
    }
    
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
    if (authState !== 'authenticated') {
      toast({
        title: "Authentication Required",
        description: "Please log in to create drawers.",
        variant: "destructive",
      });
      return;
    }

    setIsDropdownOpen(false);
    setIsModalOpen(true);
  };

  const handleModalSave = async (name: string) => {
    await createDrawer(name);
  };

  const handleDeleteDrawer = async (name: string) => {
    setIsDropdownOpen(false);
    
    if (authState !== 'authenticated') {
      toast({
        title: "Authentication Required",
        description: "Please log in to delete drawers.",
        variant: "destructive",
      });
      return;
    }
    
    await deleteDrawer(name);
  };

  // Simplified button state management
  const getButtonProps = () => {
    if (authState === 'checking') {
      return { 
        disabled: true, 
        text: "Loading...", 
        icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
      };
    }
    
    if (authState === 'unauthenticated') {
      return { 
        disabled: true, 
        text: "Login Required", 
        icon: <AlertCircle className="mr-2 h-4 w-4" /> 
      };
    }
    
    if (isCreating || isDeleting) {
      return { 
        disabled: true, 
        text: isCreating ? "Creating..." : "Deleting...", 
        icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
      };
    }
    
    return { 
      disabled: false, 
      text: "Edit Drawer", 
      icon: <Plus className="mr-2 h-4 w-4" /> 
    };
  };

  const buttonProps = getButtonProps();

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={buttonProps.disabled}>
            {buttonProps.icon}
            {buttonProps.text}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={handleNewDrawerClick}>
            <Plus className="mr-2 h-4 w-4" />
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
                <Plus className="mr-2 h-4 w-4" />
                {drawerName} {isDisabled && "(Already exists)"}
              </DropdownMenuItem>
            );
          })}
          {existingDrawers.length > 0 && (
            <>
              <DropdownMenuSeparator />
              {existingDrawers.map((drawerName) => (
                <DropdownMenuItem 
                  key={`delete-${drawerName}`} 
                  onClick={() => handleDeleteDrawer(drawerName)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {drawerName}
                </DropdownMenuItem>
              ))}
            </>
          )}
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
