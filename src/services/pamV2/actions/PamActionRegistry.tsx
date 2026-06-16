import { CalendarDays, MapPin, Receipt, Sparkles } from "lucide-react";
import type { V2ActionDisplay } from "../pamV2Reducer";

function formatDateTime(iso?: unknown): string {
  if (typeof iso !== "string" || !iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso?: unknown): string {
  if (typeof iso !== "string" || !iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatCurrency(amount?: unknown): string {
  if (amount == null || typeof amount !== "number") return "";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
}

function CalendarEventAction({ payload }: { payload: Record<string, unknown> }) {
  const title = (payload.title as string) || (payload.entity_title as string) || "Event added";
  return (
    <div className="mt-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20 px-3 py-2 text-sm">
      <div className="flex items-start gap-2">
        <CalendarDays className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-gray-800 dark:text-gray-100">{title}</p>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {payload.start_date && <span>{formatDateTime(payload.start_date)}</span>}
            {payload.end_date && <span> - {formatDateTime(payload.end_date)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExpenseAction({ payload }: { payload: Record<string, unknown> }) {
  const title = (payload.title as string) || (payload.entity_title as string) || "Expense logged";
  return (
    <div className="mt-2 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20 px-3 py-2 text-sm">
      <div className="flex items-start gap-2">
        <Receipt className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-600 dark:text-orange-400" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-gray-800 dark:text-gray-100">{title}</p>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {payload.amount != null && <span>{formatCurrency(payload.amount)}</span>}
            {payload.category && <span>{String(payload.category)}</span>}
            {payload.date && <span>{formatDate(payload.date)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function TripAction({ payload }: { payload: Record<string, unknown> }) {
  const title = (payload.title as string) || (payload.entity_title as string) || "Trip planned";
  return (
    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20 px-3 py-2 text-sm">
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-gray-800 dark:text-gray-100">{title}</p>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {payload.destination && <span>{String(payload.destination)}</span>}
            {payload.destination && payload.start_date && <span> - </span>}
            {payload.start_date && <span>{formatDate(payload.start_date)}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function UnknownAction({ actionType }: { actionType: string }) {
  return (
    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800 px-3 py-2 text-sm">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-500" />
        <p className="text-gray-600 dark:text-gray-300">
          Action: <span className="font-medium">{actionType}</span>
        </p>
      </div>
    </div>
  );
}

export function PamActionRenderer({ action }: { action: V2ActionDisplay }) {
  switch (action.actionType) {
    case "calendar_event":
      return <CalendarEventAction payload={action.payload} />;
    case "expense":
    case "expense_logged":
      return <ExpenseAction payload={action.payload} />;
    case "trip":
    case "trip_planned":
      return <TripAction payload={action.payload} />;
    default:
      return <UnknownAction actionType={action.actionType} />;
  }
}

export function PamActionRegistry({ actions }: { actions: V2ActionDisplay[] }) {
  return (
    <div className="space-y-1">
      {actions.map((action) => (
        <PamActionRenderer key={action.id} action={action} />
      ))}
    </div>
  );
}
