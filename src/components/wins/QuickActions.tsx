import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Receipt, 
  Fuel, 
  DollarSign, 
  Mic,
  Loader2,
  AlertCircle,
  TrendingUp
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QuickActionsProps {
  onAddExpense: (preset?: { category?: string }) => void;
  onAddIncome: () => void;
  onOpenReceipt: () => void;
  onVoiceEntry: () => void;
  isVoiceAvailable?: boolean;
  isOffline?: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  onAddExpense,
  onAddIncome,
  onOpenReceipt,
  onVoiceEntry,
  isVoiceAvailable = false,
  isOffline = false
}) => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleQuickAction = async (action: string, callback: () => void) => {
    if (isOffline && action !== 'voice') {
      toast({
        title: "Offline Mode",
        description: "This action is not available offline. Your data will sync when you're back online.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(action);
    try {
      // Add a small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      callback();
    } catch (error) {
      toast({
        title: "Action Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(null);
    }
  };

  const quickActions = [
    {
      id: 'expense',
      label: 'Quick Expense',
      icon: DollarSign,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => onAddExpense(),
      description: 'Add a new expense'
    },
    {
      id: 'fuel',
      label: 'Log Fuel',
      icon: Fuel,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => onAddExpense({ category: 'Fuel' }),
      description: 'Quick fuel expense'
    },
    {
      id: 'receipt',
      label: 'Scan Receipt',
      icon: Receipt,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: onOpenReceipt,
      description: 'Upload receipt photo'
    },
    {
      id: 'voice',
      label: 'Voice Entry',
      icon: Mic,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: onVoiceEntry,
      description: 'Speak to log expense',
      disabled: !isVoiceAvailable
    }
  ];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          Quick Actions
          <span className="text-xs font-normal text-muted-foreground">
            Common tasks at your fingertips
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isOffline && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You're offline. Some features may be limited.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
          {quickActions.map(action => (
            <Button
              key={action.id}
              onClick={() => handleQuickAction(action.id, action.action)}
              disabled={action.disabled || isProcessing !== null}
              className={`
                h-20 md:h-24 flex-col gap-1 md:gap-2 relative overflow-hidden transition-all
                ${action.color} text-white
                ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${isProcessing === action.id ? 'scale-95' : ''}
              `}
              variant="ghost"
              aria-label={action.description}
              aria-disabled={action.disabled || isProcessing !== null}
            >
              {isProcessing === action.id ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <>
                  <action.icon className="h-6 w-6 md:h-8 md:w-8" />
                  <span className="text-xs md:text-sm font-medium">{action.label}</span>
                </>
              )}
              
              {/* Tooltip on hover (desktop only) */}
              <span className="hidden md:block absolute inset-x-0 -bottom-10 bg-black/80 text-white text-xs py-1 px-2 
                             opacity-0 hover:opacity-100 hover:bottom-0 transition-all duration-200"
                    role="tooltip">
                {action.description}
              </span>
            </Button>
          ))}
        </div>

        {/* Additional quick income button */}
        <Button
          onClick={() => handleQuickAction('income', onAddIncome)}
          disabled={isProcessing !== null}
          className="w-full mt-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
          aria-label="Add new income entry"
        >
          {isProcessing === 'income' ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <TrendingUp className="h-4 w-4 mr-2" />
          )}
          Add Income
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickActions;