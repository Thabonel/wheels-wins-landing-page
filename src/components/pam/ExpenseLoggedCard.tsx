import { Receipt } from "lucide-react";
import { type UIAction } from "@/types/pamTypes";

interface Props {
  action: UIAction;
}

function formatCurrency(amount?: number): string {
  if (amount == null) return "";
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function ExpenseLoggedCard({ action }: Props) {
  const { entity_title, metadata } = action;

  const handleView = () => {
    if (window.location.pathname !== '/wins') {
      window.location.href = '/wins#expenses';
    } else {
      document.getElementById('expenses-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="mt-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#e8c9b5', backgroundColor: '#fdf4ef' }}>
      <div className="flex items-start gap-2">
        <Receipt className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#C65D3C' }} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" style={{ color: '#4A4A4A' }}>
            {entity_title || "Expense logged"}
          </p>
          <div className="flex gap-2 mt-0.5 text-xs" style={{ color: '#6B7280' }}>
            {metadata?.amount != null && <span>{formatCurrency(metadata.amount)}</span>}
            {metadata?.category && <span>{metadata.category}</span>}
            {metadata?.date && <span>{formatDate(metadata.date)}</span>}
          </div>
        </div>
        <button
          onClick={handleView}
          className="text-xs font-medium flex-shrink-0 hover:underline"
          style={{ color: '#C65D3C' }}
        >
          View
        </button>
      </div>
    </div>
  );
}
