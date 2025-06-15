
import React, { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle, Wifi, WifiOff } from "lucide-react";
import { presetDrawers } from './drawer-selector/constants';
import { useDrawerOperations } from './drawer-selector/useDrawerOperations';
import NewDrawerModal from './drawer-selector/NewDrawerModal';

interface DrawerSelectorProps {
  onDrawerCreated: (drawer: any) => void;
}

const DrawerSelector: React.FC<DrawerSelectorProps> = ({ onDrawerCreated }) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  const { existingDrawers, isCreating, authState, retryCount, createDrawer } = useDrawerOperations(onDrawerCreated);

  // Monitor network connectivity
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handlePresetSelect = async (name: string) => {
    setIsDropdownOpen(false);
    
    // Enhanced validation
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

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
    
    console.log("Creating preset drawer:", name);
    await createDrawer(name);
  };

  const handleNewDrawerClick = () => {
    if (!isOnline) {
      toast({
        title: "No Internet Connection",
        description: "Please check your internet connection and try again.",
        variant: "destructive",
      });
      return;
    }

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
    console.log("Creating custom drawer:", name);
    await createDrawer(name);
  };

  // Enhanced button state management
  const getButtonState = () => {
    if (!isOnline) return { disabled: true, text: "Offline", icon: <WifiOff className="mr-2 h-4 w-4" /> };
    if (authState === 'checking') return { disabled: true, text: "Loading...", icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" /> };
    if (authState === 'unauthenticated') return { disabled: true, text: "Login Required", icon: <AlertCircle className="mr-2 h-4 w-4" /> };
    if (isCreating) return { disabled: true, text: retryCount > 1 ? `Retrying... (${retryCount})` : "Creating...", icon: <Loader2 className="mr-2 h-4 w-4 animate-spin" /> };
    return { disabled: false, text: "+ Add Drawer", icon: isOnline ? <Wifi className="mr-2 h-4 w-4 text-green-500" /> : null };
  };

  const buttonState = getButtonState();

  return (
    <>
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={buttonState.disabled}>
            {buttonState.icon}
            {buttonState.text}
            {/* Development debug info */}
            {process.env.NODE_ENV === 'development' && (
              <span className="ml-2 text-xs opacity-50">
                [{authState}]
              </span>
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
