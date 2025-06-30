import { Car, Bike, MapPin, Users } from "lucide-react";
interface TravelModeButtonsProps {
  activeMode: string;
  onModeChange: (mode: string) => void;
}
export default function TravelModeButtons({
  activeMode,
  onModeChange
}: TravelModeButtonsProps) {
  const modes = [{
    id: 'traffic',
    label: 'Traffic',
    icon: Car
  }, {
    id: 'driving',
    label: 'Driving',
    icon: Car
  }, {
    id: 'walking',
    label: 'Walking',
    icon: Users
  }, {
    id: 'cycling',
    label: 'Cycling',
    icon: Bike
  }];
  return;
}