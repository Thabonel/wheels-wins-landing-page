import { MapPin } from "lucide-react";
import { type UIAction } from "@/types/pamTypes";

interface Props {
  action: UIAction;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function TripPlannedCard({ action }: Props) {
  const { entity_title, metadata } = action;

  const handleView = () => {
    if (window.location.pathname !== '/wheels') {
      window.location.href = '/wheels#trips';
    } else {
      document.getElementById('trips-section')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="mt-2 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#b8c9d9', backgroundColor: '#eef3f8' }}>
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#2C3E50' }} />
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate" style={{ color: '#4A4A4A' }}>
            {entity_title || "Trip planned"}
          </p>
          {(metadata?.start_date || metadata?.destination) && (
            <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
              {metadata.destination ? `${metadata.destination}` : ""}
              {metadata.destination && metadata.start_date ? " - " : ""}
              {metadata.start_date ? formatDate(metadata.start_date) : ""}
            </p>
          )}
        </div>
        <button
          onClick={handleView}
          className="text-xs font-medium flex-shrink-0 hover:underline"
          style={{ color: '#2C3E50' }}
        >
          View
        </button>
      </div>
    </div>
  );
}
