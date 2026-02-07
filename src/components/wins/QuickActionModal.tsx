import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import AddExpenseForm from './expenses/AddExpenseForm';
import ExpenseReceiptUpload from './expenses/ExpenseReceiptUpload';
import FuelReceiptUpload from '@/components/wheels/FuelReceiptUpload';
import AddIncomeForm from './income/AddIncomeForm';
import { useIncomeData } from './income/useIncomeData';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type QuickActionType = 'expense' | 'fuel' | 'receipt' | 'voice' | 'income' | null;

interface QuickActionModalProps {
  open: QuickActionType;
  onClose: () => void;
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({ open, onClose }) => {
  const isMobile = useIsMobile();
  const { addIncome } = useIncomeData();
  
  if (!open) return null;

  const getTitle = () => {
    switch (open) {
      case 'expense':
        return 'Add Expense';
      case 'fuel':
        return 'Log Fuel';
      case 'receipt':
        return 'Scan Receipt';
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
      case 'fuel':
        return (
          <FuelReceiptUpload
            onEntryCreated={onClose}
            onCancel={onClose}
          />
        );
      case 'receipt':
        return (
          <ExpenseReceiptUpload
            onExpenseCreated={onClose}
            onCancel={onClose}
          />
        );
      case 'expense':
      case 'voice':
        return (
          <AddExpenseForm
            onClose={onClose}
            startWithVoice={open === 'voice'}
          />
        );
      case 'income':
        return <AddIncomeForm onAddIncome={addIncome} onClose={onClose} />;
      default:
        return null;
    }
  };

  // Mobile: Use drawer from bottom
  if (isMobile) {
    return (
      <Drawer open={!!open} onOpenChange={(isOpen) => !isOpen && onClose()} shouldScaleBackground={true}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <DrawerHeader className="relative pb-3 flex-shrink-0">
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
          <div className="flex-1 overflow-y-auto px-4 pb-6" style={{ scrollBehavior: 'smooth' }}>
            {getContent()}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Use centered dialog
  return (
    <Dialog open={!!open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
      >
        <DialogHeader className="pb-3 flex-shrink-0">
          <DialogTitle>{getTitle()}</DialogTitle>
        </DialogHeader>
        <div 
          className="flex-1 overflow-y-auto pr-2 pb-4" 
          style={{ scrollBehavior: 'smooth' }}
        >
          {getContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
};