import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { QuickActionsHub } from './QuickActionsHub';

interface QuickActionFABProps {
  className?: string;
}

export const QuickActionFAB: React.FC<QuickActionFABProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Action Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={cn(
          "fixed bottom-6 right-6 z-40",
          "md:bottom-8 md:right-8",
          className
        )}
      >
        <Button
          onClick={handleToggle}
          size="lg"
          className={cn(
            "h-14 w-14 rounded-full shadow-lg hover:shadow-xl",
            "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
            "transition-all duration-200 ease-in-out",
            "border-2 border-white dark:border-gray-900",
            isOpen && "rotate-45"
          )}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 45, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="h-6 w-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="plus"
                initial={{ rotate: 45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -45, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Plus className="h-6 w-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>

        {/* Ripple Effect */}
        <motion.div
          className="absolute inset-0 rounded-full bg-blue-400 opacity-20 -z-10"
          animate={{
            scale: isOpen ? [1, 1.2, 1] : 1,
          }}
          transition={{
            duration: 0.3,
            repeat: isOpen ? Infinity : 0,
            repeatDelay: 1,
          }}
        />
      </motion.div>

      {/* Quick Actions Modal */}
      <QuickActionsHub isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default QuickActionFAB;