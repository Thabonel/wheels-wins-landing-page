import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
    // Full-screen modal for mobile with safe padding
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="h-screen w-screen max-w-none m-0 p-4 rounded-none">
          <div className="h-full w-full overflow-y-auto">
            <div className="space-y-4">
              {children}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Centered dialog for desktop
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-6">
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="space-y-4">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};