
import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Region } from "@/context/RegionContext";
import { supabase } from "@/integrations/supabase/client";

interface RegionSelectorProps {
  onRegionChange?: (region: Region) => void;
  className?: string;
  disabled?: boolean;
  defaultValue?: Region;
}

export default function RegionSelector({ 
  onRegionChange, 
  className = "", 
  disabled = false, 
  defaultValue = "Australia" 
}: RegionSelectorProps) {
  const [selectedRegion, setSelectedRegion] = useState<Region>(defaultValue);

  const handleRegionChange = (value: string) => {
    const region = value as Region;
    setSelectedRegion(region);
    
    if (onRegionChange) {
      onRegionChange(region);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="region-select" className="font-medium">Select Your Region</Label>
      <p className="text-sm text-muted-foreground">
        This helps us provide region-specific content, tools, and product recommendations.
      </p>
      
      <Select 
        value={selectedRegion}
        onValueChange={handleRegionChange}
        disabled={disabled}
      >
        <SelectTrigger id="region-select" className="w-full">
          <SelectValue placeholder="Select region" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="Australia">Australia</SelectItem>
            <SelectItem value="New Zealand">New Zealand</SelectItem>
            <SelectItem value="United States">United States</SelectItem>
            <SelectItem value="Canada">Canada</SelectItem>
            <SelectItem value="United Kingdom">United Kingdom</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  );
}
