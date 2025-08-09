
import { Button } from "@/components/ui/button";
import { Lock, Unlock } from "lucide-react";

interface LockedPointControlsProps {
  originLocked: boolean;
  destinationLocked: boolean;
  originName: string;
  destName: string;
  onUnlockOrigin: () => void;
  onUnlockDestination: () => void;
  disabled?: boolean;
}

export default function LockedPointControls({
  originLocked,
  destinationLocked,
  originName,
  destName,
  onUnlockOrigin,
  onUnlockDestination,
  disabled = false,
}: LockedPointControlsProps) {
  if (!originLocked && !destinationLocked) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
      <h4 className="text-sm font-medium text-blue-800">Locked Route Points</h4>
      
      {originLocked && originName && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">
              Start: {originName.length > 30 ? `${originName.substring(0, 30)}...` : originName}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onUnlockOrigin}
            disabled={disabled}
            className="text-xs"
          >
            <Unlock className="w-3 h-3 mr-1" />
            Change
          </Button>
        </div>
      )}

      {destinationLocked && destName && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-purple-600" />
            <span className="text-sm text-purple-700">
              End: {destName.length > 30 ? `${destName.substring(0, 30)}...` : destName}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onUnlockDestination}
            disabled={disabled}
            className="text-xs"
          >
            <Unlock className="w-3 h-3 mr-1" />
            Change
          </Button>
        </div>
      )}
    </div>
  );
}
