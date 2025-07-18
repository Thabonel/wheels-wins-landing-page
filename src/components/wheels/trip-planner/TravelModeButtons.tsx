import { Car, Bike, Users, MapPin, Zap, Mountain, Crown, Navigation, MousePointer } from "lucide-react";
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
  routeType: string;
  onRouteTypeChange: (routeType: string) => void;
  manualMode: boolean;
  onManualModeChange: (enabled: boolean) => void;
}
export default function TravelModeButtons({
  activeMode,
  onModeChange,
  exclude,
  onExcludeChange,
  annotations,
  onAnnotationsChange,
  vehicle,
  onVehicleChange,
  routeType,
  onRouteTypeChange,
  manualMode,
  onManualModeChange
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
  const routeTypes = [
    {
      id: "fastest",
      label: "Fastest (routing)",
      icon: Zap,
      description: "Fastest route using traffic data"
    },
    {
      id: "shortest",
      label: "Shortest (routing)",
      icon: Navigation,
      description: "Shortest distance route"
    },
    {
      id: "scenic",
      label: "Scenic (routing)",
      icon: Mountain,
      description: "Scenic route through beautiful landscapes"
    },
    {
      id: "off_grid",
      label: "Off-grid",
      icon: MapPin,
      description: "Remote routes avoiding highways"
    },
    {
      id: "luxury",
      label: "Luxury",
      icon: Crown,
      description: "Premium route with high-end amenities"
    },
    {
      id: "manual",
      label: "Manual",
      icon: MousePointer,
      description: "Click to create locked waypoints"
    }
  ];

  const handleRouteTypeChange = (value: string) => {
    if (value === "manual") {
      onManualModeChange(true);
    } else {
      onManualModeChange(false);
    }
    onRouteTypeChange(value);
  };

  return <div className="space-y-3">
      
      {/* Route Type Selection */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Route Type</Label>
        <Select value={routeType} onValueChange={handleRouteTypeChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select route type">
              {routeTypes.find(type => type.id === routeType)?.label || "Select route type"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {routeTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                <div className="flex items-center gap-2">
                  <type.icon className="w-4 h-4" />
                  <div className="flex flex-col">
                    <span>{type.label}</span>
                    <span className="text-xs text-gray-500">{type.description}</span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Manual Mode Instructions */}
      {manualMode && (
        <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
          <div className="flex items-start gap-2">
            <MousePointer className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Manual Route Mode</p>
              <p className="text-xs text-blue-700 mt-1">
                Click anywhere on the map to create locked waypoints. The route will be forced through each click point in order.
              </p>
            </div>
          </div>
        </div>
      )}

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
    </div>;
}