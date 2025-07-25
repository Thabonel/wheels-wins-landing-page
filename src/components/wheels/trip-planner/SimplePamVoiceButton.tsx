import React, { useState, useEffect } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface SimplePamVoiceButtonProps {
  onDirectionsToggle?: (enabled: boolean) => void;
  className?: string;
}

const SimplePamVoiceButton: React.FC<SimplePamVoiceButtonProps> = ({
  onDirectionsToggle,
  className
}) => {
  const [directionsEnabled, setDirectionsEnabled] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();

  const handleToggle = () => {
    const newState = !directionsEnabled;
    setDirectionsEnabled(newState);
    
    if (onDirectionsToggle) {
      onDirectionsToggle(newState);
    }

    toast({
      title: newState ? "Voice Directions Enabled" : "Voice Directions Disabled",
      description: newState 
        ? "PAM will announce turn-by-turn directions" 
        : "PAM is muted for this trip",
      duration: 2000,
    });
  };

  return (
    <Button
      onClick={handleToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      variant="default"
      size="icon"
      className={cn(
        "rounded-full shadow-lg transition-all duration-200",
        "bg-white hover:bg-gray-100 text-gray-700 hover:text-gray-900",
        "border border-gray-200",
        "w-12 h-12",
        className
      )}
      aria-label={directionsEnabled ? "Disable voice directions" : "Enable voice directions"}
    >
      {directionsEnabled ? (
        <Mic className="h-5 w-5" />
      ) : (
        <MicOff className="h-5 w-5 text-red-500" />
      )}
      
      {/* Tooltip on hover */}
      {isHovered && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <div className="bg-gray-900 text-white text-xs rounded py-1 px-2">
            {directionsEnabled ? "Mute directions" : "Enable directions"}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-px">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        </div>
      )}
    </Button>
  );
};

export default SimplePamVoiceButton;