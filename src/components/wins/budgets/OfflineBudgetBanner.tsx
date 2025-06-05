
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff } from "lucide-react";

export default function OfflineBudgetBanner() {
  return (
    <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800 mb-4">
      <WifiOff className="h-4 w-4" />
      <AlertDescription>
        Offline Mode: Budget View is Read-Only
      </AlertDescription>
    </Alert>
  );
}
