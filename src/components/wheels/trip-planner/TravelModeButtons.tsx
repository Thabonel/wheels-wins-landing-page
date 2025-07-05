
import { Car, Bike, Users } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface TravelModeButtonsProps {
  activeMode: string;
  onModeChange: (mode: string) => void;
  exclude: string[];
  onExcludeChange: (values: string[]) => void;
  annotations: string[];
  onAnnotationsChange: (values: string[]) => void;
  vehicle: string;
  onVehicleChange: (vehicle: string) => void;
}

export default function TravelModeButtons({
  activeMode,
  onModeChange,
  exclude,
  onExcludeChange,
  annotations,
  onAnnotationsChange,
  vehicle,
  onVehicleChange
}: TravelModeButtonsProps) {
  const modes = [{
    id: "traffic",
    label: "Traffic",
    icon: Car
  }, {
    id: "driving",
    label: "Driving",
    icon: Car
  }, {
    id: "walking",
    label: "Walking",
    icon: Users
  }, {
    id: "cycling",
    label: "Cycling",
    icon: Bike
  }];

  const toggleExclude = (type: string, checked: boolean) => {
    const list = checked ? [...exclude, type] : exclude.filter(t => t !== type);
    onExcludeChange(list);
  };

  const toggleAnnotation = (value: string, checked: boolean) => {
    const list = checked ? [...annotations, value] : annotations.filter(a => a !== value);
    onAnnotationsChange(list);
  };

  return (
    <div className="space-y-3">
      <ToggleGroup type="single" value={activeMode} onValueChange={v => v && onModeChange(v)}>
        {modes.map(({ id, label, icon: Icon }) => (
          <ToggleGroupItem key={id} value={id} className="flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={exclude.includes('toll')} onCheckedChange={c => toggleExclude('toll', !!c)} />
          Avoid tolls
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={exclude.includes('ferry')} onCheckedChange={c => toggleExclude('ferry', !!c)} />
          Avoid ferries
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm">Vehicle</Label>
        <Select value={vehicle} onValueChange={onVehicleChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="car" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="car">Car</SelectItem>
            <SelectItem value="truck">Truck</SelectItem>
            <SelectItem value="bus">Bus</SelectItem>
            <SelectItem value="motorcycle">Motorcycle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={annotations.includes('duration')} onCheckedChange={c => toggleAnnotation('duration', !!c)} />
          Duration
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={annotations.includes('distance')} onCheckedChange={c => toggleAnnotation('distance', !!c)} />
          Distance
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={annotations.includes('congestion')} onCheckedChange={c => toggleAnnotation('congestion', !!c)} />
          Congestion
        </label>
      </div>
    </div>
  );
}
