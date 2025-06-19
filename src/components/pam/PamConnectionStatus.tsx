
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Zap } from "lucide-react";

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
    <Badge 
      variant={isConnected ? "default" : "secondary"} 
      className={`text-xs ${isConnected ? 'bg-green-600' : 'bg-orange-500 text-white'}`}
    >
      {isConnected ? (
        <>
          <Wifi className="w-3 h-3 mr-1" />
          Live
        </>
      ) : (
        <>
          <Zap className="w-3 h-3 mr-1" />
          Demo
        </>
      )}
    </Badge>
  );
};

export default PamConnectionStatus;
