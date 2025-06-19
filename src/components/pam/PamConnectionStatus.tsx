
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";

interface PamConnectionStatusProps {
  isConnected: boolean;
  variant?: "badge" | "indicator";
}

const PamConnectionStatus = ({ isConnected, variant = "badge" }: PamConnectionStatusProps) => {
  if (variant === "indicator") {
    return (
      <div className={`w-4 h-4 rounded-full border-2 border-white ${
        isConnected ? 'bg-green-500' : 'bg-orange-500'
      }`} />
    );
  }

  return (
    <Badge variant={isConnected ? "default" : "destructive"} className="text-xs">
      {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
      {isConnected ? "Backend" : "Connecting"}
    </Badge>
  );
};

export default PamConnectionStatus;
