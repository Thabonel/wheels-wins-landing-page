
import { Button } from "@/components/ui/button";

interface PamQuickActionsProps {
  onQuickAction: (action: string) => void;
  isProcessing: boolean;
  isConnected: boolean;
}

const PamQuickActions = ({ onQuickAction, isProcessing, isConnected }: PamQuickActionsProps) => {
  const quickActions = [
    { key: 'add_expense', label: '💰 Add Expense' },
    { key: 'check_budget', label: '📊 Check Budget' },
    { key: 'plan_trip', label: '🚗 Plan Trip' },
    { key: 'add_groceries', label: '🛒 Groceries' }
  ];

  return (
    <div className="grid grid-cols-2 gap-2 mb-3">
      {quickActions.map((action) => (
        <Button
          key={action.key}
          size="sm"
          variant="outline"
          onClick={() => onQuickAction(action.key)}
          className={`text-xs ${!isConnected ? 'border-orange-200 text-orange-700' : ''}`}
          disabled={isProcessing}
          title={!isConnected ? 'Demo mode - limited functionality' : ''}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
};

export default PamQuickActions;
