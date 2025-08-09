
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TravelPreferencesProps {
  formData: any;
  setFormData: (updater: (prev: any) => any) => void;
}

export const TravelPreferences = ({ formData, setFormData }: TravelPreferencesProps) => {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Travel Preferences</h2>
        
        <div className="space-y-2">
          <Label>Max comfortable daily driving (km)</Label>
          <Input 
            placeholder="e.g. 300" 
            value={formData.maxDriving}
            onChange={(e) => setFormData(prev => ({ ...prev, maxDriving: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Preferred camp types</Label>
          <Input 
            placeholder="Free, Paid, Bush, RV Park..." 
            value={formData.campTypes}
            onChange={(e) => setFormData(prev => ({ ...prev, campTypes: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Accessibility or mobility needs?</Label>
          <Input 
            placeholder="Optional" 
            value={formData.accessibility}
            onChange={(e) => setFormData(prev => ({ ...prev, accessibility: e.target.value }))}
          />
        </div>
        
        <div className="space-y-2">
          <Label>Pets on board?</Label>
          <Input 
            placeholder="e.g. 2 dogs" 
            value={formData.pets}
            onChange={(e) => setFormData(prev => ({ ...prev, pets: e.target.value }))}
          />
        </div>
      </CardContent>
    </Card>
  );
};
