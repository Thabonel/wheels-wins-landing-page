
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff } from "lucide-react";
import { useOffline } from "@/context/OfflineContext";

export default function OfflineBanner() {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800 mb-4">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        Offline Mode: Using Saved Data
      </AlertDescription>
    </Alert>
  );
}
