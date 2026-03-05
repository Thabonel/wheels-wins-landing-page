import { CalendarDays } from "lucide-react";
import { type UIAction } from "@/types/pamTypes";

interface Props {
  action: UIAction;
}

function formatDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function CalendarEventCard({ action }: Props) {
  const { entity_title, metadata } = action;

  const handleView = () => {
    if (window.location.pathname !== '/you') {
      window.location.href = '/you#calendar';
    } else {
      document.getElementById('calendar-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="mt-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#c3d9b8', backgroundColor: '#f0f7ec' }}>
      <div className="flex items-start gap-2">
        <CalendarDays className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#7B9E6B' }} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" style={{ color: '#4A4A4A' }}>
            {entity_title || "Event added"}
          </p>
          {metadata?.start_date && (
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
              {formatDateTime(metadata.start_date)}
              {metadata.end_date ? ` - ${formatDateTime(metadata.end_date)}` : ""}
            </p>
          )}
        </div>
        <button
          onClick={handleView}
          className="text-xs font-medium flex-shrink-0 hover:underline"
          style={{ color: '#7B9E6B' }}
        >
          View
        </button>
      </div>
    </div>
  );
}
