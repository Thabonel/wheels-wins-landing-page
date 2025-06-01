
import { Car, Bike, MapPin, Users } from "lucide-react";

interface TravelModeButtonsProps {
  activeMode: string;
  onModeChange: (mode: string) => void;
}

export default function TravelModeButtons({ activeMode, onModeChange }: TravelModeButtonsProps) {
  const modes = [
    { id: 'traffic', label: 'Traffic', icon: Car },
    { id: 'driving', label: 'Driving', icon: Car },
    { id: 'walking', label: 'Walking', icon: Users },
    { id: 'cycling', label: 'Cycling', icon: Bike },
  ];

  return (
    <div className="absolute bottom-4 left-4 z-10 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 lg:block hidden">
      <div className="flex gap-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.id;
          
          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors text-sm ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon size={14} />
              <span className="font-medium">{mode.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
