import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus, X, Receipt, Fuel, DollarSign, MapPin, Car, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { QuickActionForm } from './QuickActionForm';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export type QuickActionType = 'expense' | 'fuel' | 'receipt' | 'mileage' | 'maintenance' | 'shopping';

interface QuickAction {
  id: QuickActionType;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  description: string;
}

const quickActions: QuickAction[] = [
  {
    id: 'expense',
    label: 'Add Expense',
    icon: DollarSign,
    color: 'bg-red-500 hover:bg-red-600',
    description: 'Track a new expense'
  },
  {
    id: 'fuel',
    label: 'Log Fuel',
    icon: Fuel,
    color: 'bg-blue-500 hover:bg-blue-600',
    description: 'Record fuel purchase'
  },
  {
    id: 'receipt',
    label: 'Scan Receipt',
    icon: Receipt,
    color: 'bg-green-500 hover:bg-green-600',
    description: 'Upload receipt photo'
  },
  {
    id: 'mileage',
    label: 'Log Miles',
    icon: MapPin,
    color: 'bg-purple-500 hover:bg-purple-600',
    description: 'Track mileage'
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Car,
    color: 'bg-orange-500 hover:bg-orange-600',
    description: 'Log RV maintenance'
  },
  {
    id: 'shopping',
    label: 'Shopping',
    icon: ShoppingCart,
    color: 'bg-pink-500 hover:bg-pink-600',
    description: 'Add shopping expense'
  }
];

interface QuickActionsHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuickActionsHub: React.FC<QuickActionsHubProps> = ({ isOpen, onClose }) => {
  const [selectedAction, setSelectedAction] = useState<QuickActionType | null>(null);
  const [fabExpanded, setFabExpanded] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Close expanded FAB when modal opens
  useEffect(() => {
    if (isOpen) {
      setFabExpanded(false);
    }
  }, [isOpen]);

  const handleActionSelect = (actionType: QuickActionType) => {
    setSelectedAction(actionType);
    setFabExpanded(false);
  };

  const handleBackToActions = () => {
    setSelectedAction(null);
  };

  const handleClose = () => {
    setSelectedAction(null);
    onClose();
  };

  // Mobile Bottom Sheet Implementation
  if (isMobile) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={handleClose}
            />
            
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden"
            >
              {/* Handle */}
              <div className="flex justify-center p-2">
                <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedAction ? 'Add Details' : 'Quick Actions'}
                </h2>
                {selectedAction && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBackToActions}
                    className="p-2"
                  >
                    ← Back
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                  className="p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
                {selectedAction ? (
                  <QuickActionForm
                    actionType={selectedAction}
                    onComplete={handleClose}
                    onCancel={handleBackToActions}
                  />
                ) : (
                  <MobileActionGrid
                    actions={quickActions}
                    onActionSelect={handleActionSelect}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Desktop Modal Implementation
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto p-0">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {selectedAction ? 'Add Details' : 'Quick Actions'}
            </h2>
            {selectedAction && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToActions}
                className="mr-2"
              >
                ← Back
              </Button>
            )}
          </div>

          {/* Content */}
          <div className="p-6">
            {selectedAction ? (
              <QuickActionForm
                actionType={selectedAction}
                onComplete={handleClose}
                onCancel={handleBackToActions}
              />
            ) : (
              <DesktopActionGrid
                actions={quickActions}
                onActionSelect={handleActionSelect}
              />
            )}
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

// Mobile Action Grid Component
const MobileActionGrid: React.FC<{
  actions: QuickAction[];
  onActionSelect: (action: QuickActionType) => void;
}> = ({ actions, onActionSelect }) => {
  return (
    <div className="p-4 space-y-3">
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onActionSelect(action.id)}
          className="w-full flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 active:scale-95 transition-all duration-150"
        >
          <div className={cn("p-3 rounded-full text-white", action.color)}>
            <action.icon className="h-6 w-6" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {action.label}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {action.description}
            </p>
          </div>
          <div className="text-gray-400">
            →
          </div>
        </motion.button>
      ))}
    </div>
  );
};

// Desktop Action Grid Component
const DesktopActionGrid: React.FC<{
  actions: QuickAction[];
  onActionSelect: (action: QuickActionType) => void;
}> = ({ actions, onActionSelect }) => {
  return (
    <div className="grid grid-cols-2 gap-4">
      {actions.map((action, index) => (
        <motion.button
          key={action.id}
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onActionSelect(action.id)}
          className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 group"
        >
          <div className={cn("inline-flex p-3 rounded-full text-white mb-4 group-hover:scale-110 transition-transform", action.color)}>
            <action.icon className="h-8 w-8" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            {action.label}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {action.description}
          </p>
        </motion.button>
      ))}
    </div>
  );
};