import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface RouteOptionsProps {
  exclude: string[];
  onExcludeChange: (values: string[]) => void;
  vehicle: string;
  onVehicleChange: (vehicle: string) => void;
}

export default function RouteOptions({
  exclude,
  onExcludeChange,
  vehicle,
  onVehicleChange
}: RouteOptionsProps) {
  const toggleExclude = (type: string, checked: boolean) => {
    const list = checked ? [...exclude, type] : exclude.filter(t => t !== type);
    onExcludeChange(list);
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
      <div className="text-sm font-medium text-foreground/80">Route Options</div>
      
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox 
            checked={exclude.includes('toll')} 
            onCheckedChange={c => toggleExclude('toll', !!c)} 
          />
          Avoid tolls
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox 
            checked={exclude.includes('ferry')} 
            onCheckedChange={c => toggleExclude('ferry', !!c)} 
          />
          Avoid ferries
        </label>
      </div>

      <div className="flex items-center gap-2">
        <Label className="text-sm">Vehicle Type</Label>
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
    </div>
  );
}