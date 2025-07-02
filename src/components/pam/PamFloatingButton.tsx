
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { getPublicAssetUrl } from "@/utils/publicAssets";

interface PamFloatingButtonProps {
  onClick: () => void;
  isConnected: boolean;
}

const PamFloatingButton = ({ onClick, isConnected }: PamFloatingButtonProps) => {
  return (
    <div className="relative">
      <Button
        className="h-14 w-14 rounded-full shadow-lg border border-blue-100 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
        onClick={onClick}
      >
        <Avatar className="h-10 w-10">
          <img src={getPublicAssetUrl('Pam.webp')} alt="Pam" />
        </Avatar>
      </Button>
      
      {/* Connection Status Indicator */}
      <div className="absolute -top-1 -right-1">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} border-2 border-white`} />
      </div>
    </div>
  );
};

export default PamFloatingButton;
