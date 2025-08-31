/**
 * Emergency Location Selector
 * Allows users to manually select their country for emergency numbers
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MapPin, Phone, Globe, Check } from 'lucide-react';
import { EMERGENCY_DATABASE, setUserCountry } from '@/services/emergency/emergencyService';
import { toast } from 'sonner';

interface EmergencyLocationSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCountry?: string;
  onCountryChange?: (country: string) => void;
}

export const EmergencyLocationSelector: React.FC<EmergencyLocationSelectorProps> = ({
  open,
  onOpenChange,
  currentCountry = 'US',
  onCountryChange
}) => {
  const [selectedCountry, setSelectedCountry] = useState(currentCountry);
  const [searchTerm, setSearchTerm] = useState('');

  // Get sorted list of countries
  const countries = Object.entries(EMERGENCY_DATABASE)
    .filter(([code]) => code !== 'DEFAULT')
    .sort((a, b) => a[1].name.localeCompare(b[1].name));

  // Filter countries based on search
  const filteredCountries = countries.filter(([code, info]) => 
    info.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    info.number.includes(searchTerm)
  );

  const handleSave = () => {
    setUserCountry(selectedCountry);
    if (onCountryChange) {
      onCountryChange(selectedCountry);
    }
    toast.success(`Emergency location set to ${EMERGENCY_DATABASE[selectedCountry as keyof typeof EMERGENCY_DATABASE].name}`);
    onOpenChange(false);
    
    // Force a page refresh to update all components
    window.location.reload();
  };

  const selectedInfo = EMERGENCY_DATABASE[selectedCountry as keyof typeof EMERGENCY_DATABASE];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Select Your Location
          </DialogTitle>
          <DialogDescription>
            Choose your current country to display the correct emergency numbers
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search input */}
          <div className="space-y-2">
            <Label htmlFor="search">Search country or emergency number</Label>
            <Input
              id="search"
              placeholder="e.g., Australia, 000, Japan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Country list */}
          <div className="space-y-2">
            <Label>Select country</Label>
            <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-1">
              {filteredCountries.map(([code, info]) => (
                <Button
                  key={code}
                  variant={selectedCountry === code ? "secondary" : "ghost"}
                  className="w-full justify-start text-left"
                  onClick={() => setSelectedCountry(code)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      {selectedCountry === code && <Check className="h-4 w-4" />}
                      <span>{info.name}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {info.number}
                    </span>
                  </div>
                </Button>
              ))}
              {filteredCountries.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No countries found matching "{searchTerm}"
                </p>
              )}
            </div>
          </div>

          {/* Selected country info */}
          {selectedInfo && (
            <Alert>
              <Phone className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-semibold">{selectedInfo.name}</div>
                  <div className="text-sm space-y-1">
                    <div>Emergency: <span className="font-bold">{selectedInfo.number}</span></div>
                    {selectedInfo.medical !== selectedInfo.number && (
                      <div>Medical: {selectedInfo.medical}</div>
                    )}
                    {selectedInfo.police !== selectedInfo.number && (
                      <div>Police: {selectedInfo.police}</div>
                    )}
                    {selectedInfo.fire !== selectedInfo.number && (
                      <div>Fire: {selectedInfo.fire}</div>
                    )}
                    {selectedInfo.notes && (
                      <div className="text-xs text-muted-foreground mt-2">
                        {selectedInfo.notes}
                      </div>
                    )}
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Popular destinations for RV travelers */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Popular RV destinations</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedCountry('US')}
              >
                🇺🇸 USA (911)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedCountry('CA')}
              >
                🇨🇦 Canada (911)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedCountry('AU')}
              >
                🇦🇺 Australia (000)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedCountry('NZ')}
              >
                🇳🇿 New Zealand (111)
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedCountry('EU')}
              >
                🇪🇺 Europe (112)
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <MapPin className="h-4 w-4 mr-2" />
            Set Location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};