
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface VehicleSetupProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

export const VehicleSetup = ({ formData, setFormData }: VehicleSetupProps) => {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Your Vehicle Setup</h2>
        
        <div className="space-y-2">
          <Label>Vehicle Type</Label>
          <Input 
            placeholder="RV, 4WD, Caravan..." 
            value={formData.vehicleType}
            onChange={(e) => setFormData(prev => ({ ...prev, vehicleType: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Make / Model / Year</Label>
          <Input 
            placeholder="Toyota LandCruiser 2022" 
            value={formData.vehicleMakeModel}
            onChange={(e) => setFormData(prev => ({ ...prev, vehicleMakeModel: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Fuel Type</Label>
          <Select
            value={formData.fuelType}
            onValueChange={(val) => setFormData(prev => ({ ...prev, fuelType: val }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Diesel">Diesel</SelectItem>
              <SelectItem value="Petrol">Petrol</SelectItem>
              <SelectItem value="Electric">Electric</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Are you towing?</Label>
          <Input 
            placeholder="Type, weight, make/model" 
            value={formData.towing}
            onChange={(e) => setFormData(prev => ({ ...prev, towing: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Are you towing a second vehicle?</Label>
          <Input 
            placeholder="e.g. Suzuki Jimny, 1.2T" 
            value={formData.secondVehicle}
            onChange={(e) => setFormData(prev => ({ ...prev, secondVehicle: e.target.value }))}
          />
        </div>
      </CardContent>
    </Card>
  );
};
