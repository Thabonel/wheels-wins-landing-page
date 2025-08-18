import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface MobileFormWrapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export const MobileFormWrapper: React.FC<MobileFormWrapperProps> = ({
  open,
  onOpenChange,
  children,
  title,
  description
}) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Full-screen modal for mobile
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-screen w-screen max-w-none m-0 p-0 rounded-none">
          <div className="h-full w-full overflow-y-auto">
            {children}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Drawer for desktop
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {children}
      </DrawerContent>
    </Drawer>
  );
};