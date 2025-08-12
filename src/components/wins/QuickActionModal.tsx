import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import AddExpenseForm from './expenses/AddExpenseForm';
import AddIncomeForm from './income/AddIncomeForm';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type QuickActionType = 'expense' | 'fuel' | 'receipt' | 'voice' | 'income' | null;

interface QuickActionModalProps {
  open: QuickActionType;
  onClose: () => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({ open, onClose }) => {
  const isMobile = useIsMobile();
  
  if (!open) return null;

  const getTitle = () => {
    switch (open) {
      case 'expense':
        return 'Add Expense';
      case 'fuel':
        return 'Log Fuel Expense';
      case 'receipt':
        return 'Upload Receipt';
      case 'voice':
        return 'Voice Entry';
      case 'income':
        return 'Add Income';
      default:
        return 'Quick Action';
    }
  };

  const getContent = () => {
    switch (open) {
      case 'expense':
      case 'fuel':
      case 'receipt':
      case 'voice':
        return (
          <AddExpenseForm
            onClose={onClose}
            presetCategory={open === 'fuel' ? 'Fuel' : undefined}
            startWithReceipt={open === 'receipt'}
            startWithVoice={open === 'voice'}
          />
        );
      case 'income':
        return <AddIncomeForm onClose={onClose} />;
      default:
        return null;
    }
  };

  // Mobile: Use drawer from bottom
  if (isMobile) {
    return (
      <Drawer open={!!open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DrawerContent className="max-h-[85vh]">
          <DrawerHeader className="relative pb-2">
            <DrawerTitle>{getTitle()}</DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-2"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-6 max-h-[calc(85vh-5rem)]">
            {getContent()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use centered dialog
  return (
    <Dialog open={!!open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-2">
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 pr-2 pb-4">
          {getContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};