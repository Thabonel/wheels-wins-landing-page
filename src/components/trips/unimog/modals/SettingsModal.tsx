import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  Settings,
  Car,
  MapPin,
  Eye,
  Volume2,
  Palette,
  Navigation,
  Fuel,
  DollarSign,
  Gauge
} from 'lucide-react';
import { toast } from 'sonner';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: TripSettings) => void;
  currentSettings?: TripSettings;
}

interface TripSettings {
  vehicle: {
    type: string;
    mpg: number;
    height: number;
    weight: number;
    length: number;
  };
  routing: {
    avoidTolls: boolean;
    avoidHighways: boolean;
    avoidFerries: boolean;
    preferScenic: boolean;
    maxDailyDistance: number;
    preferredSpeed: number;
  };
  display: {
    units: 'imperial' | 'metric';
    mapStyle: string;
    showTraffic: boolean;
    showWeather: boolean;
    showPOIs: boolean;
    autoZoom: boolean;
  };
  voice: {
    enabled: boolean;
    volume: number;
    language: string;
    announceStreetNames: boolean;
  };
  fuel: {
    tankSize: number;
    fuelType: string;
    warningLevel: number;
    avgPrice: number;
  };
}

const DEFAULT_SETTINGS: TripSettings = {
  vehicle: {
    type: 'class-a',
    mpg: 8,
    height: 12,
    weight: 26000,
    length: 35
  },
  routing: {
    avoidTolls: false,
    avoidHighways: false,
    avoidFerries: false,
    preferScenic: true,
    maxDailyDistance: 300,
    preferredSpeed: 55
  },
  display: {
    units: 'imperial',
    mapStyle: 'outdoors',
    showTraffic: true,
    showWeather: true,
    showPOIs: true,
    autoZoom: true
  },
  voice: {
    enabled: true,
    volume: 80,
    language: 'en-US',
    announceStreetNames: true
  },
  fuel: {
    tankSize: 80,
    fuelType: 'regular',
    warningLevel: 25,
    avgPrice: 3.50
  }
};

export default function SettingsModal({
  isOpen,
  onClose,
  onSave,
  currentSettings = DEFAULT_SETTINGS
}: SettingsModalProps) {
  const [settings, setSettings] = useState<TripSettings>(currentSettings);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(settings);
      toast.success('Settings saved successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to save settings');
      console.error('Error saving settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateVehicle = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      vehicle: { ...prev.vehicle, [field]: value }
    }));
  };

  const updateRouting = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      routing: { ...prev.routing, [field]: value }
    }));
  };

  const updateDisplay = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      display: { ...prev.display, [field]: value }
    }));
  };

  const updateVoice = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      voice: { ...prev.voice, [field]: value }
    }));
  };

  const updateFuel = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      fuel: { ...prev.fuel, [field]: value }
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Trip Planner Settings
          </DialogTitle>
          <DialogDescription>
            Customize your trip planning experience
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="vehicle" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
            <TabsTrigger value="routing">Routing</TabsTrigger>
            <TabsTrigger value="display">Display</TabsTrigger>
            <TabsTrigger value="voice">Voice</TabsTrigger>
            <TabsTrigger value="fuel">Fuel</TabsTrigger>
          </TabsList>

          {/* Vehicle Settings */}
          <TabsContent value="vehicle" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Car className="h-4 w-4" />
              <h3 className="font-medium">Vehicle Information</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle-type">RV Type</Label>
                <Select 
                  value={settings.vehicle.type} 
                  onValueChange={(v) => updateVehicle('type', v)}
                >
                  <SelectTrigger id="vehicle-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="class-a">Class A Motorhome</SelectItem>
                    <SelectItem value="class-b">Class B Van</SelectItem>
                    <SelectItem value="class-c">Class C Motorhome</SelectItem>
                    <SelectItem value="travel-trailer">Travel Trailer</SelectItem>
                    <SelectItem value="fifth-wheel">Fifth Wheel</SelectItem>
                    <SelectItem value="truck-camper">Truck Camper</SelectItem>
                    <SelectItem value="popup">Pop-up Camper</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mpg">Fuel Economy (MPG)</Label>
                  <Input
                    id="mpg"
                    type="number"
                    value={settings.vehicle.mpg}
                    onChange={(e) => updateVehicle('mpg', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height">Height (feet)</Label>
                  <Input
                    id="height"
                    type="number"
                    value={settings.vehicle.height}
                    onChange={(e) => updateVehicle('height', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (lbs)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={settings.vehicle.weight}
                    onChange={(e) => updateVehicle('weight', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="length">Length (feet)</Label>
                  <Input
                    id="length"
                    type="number"
                    value={settings.vehicle.length}
                    onChange={(e) => updateVehicle('length', parseFloat(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Routing Settings */}
          <TabsContent value="routing" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Navigation className="h-4 w-4" />
              <h3 className="font-medium">Route Preferences</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="avoid-tolls">Avoid Toll Roads</Label>
                  <Switch
                    id="avoid-tolls"
                    checked={settings.routing.avoidTolls}
                    onCheckedChange={(v) => updateRouting('avoidTolls', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="avoid-highways">Avoid Highways</Label>
                  <Switch
                    id="avoid-highways"
                    checked={settings.routing.avoidHighways}
                    onCheckedChange={(v) => updateRouting('avoidHighways', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="avoid-ferries">Avoid Ferries</Label>
                  <Switch
                    id="avoid-ferries"
                    checked={settings.routing.avoidFerries}
                    onCheckedChange={(v) => updateRouting('avoidFerries', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="prefer-scenic">Prefer Scenic Routes</Label>
                  <Switch
                    id="prefer-scenic"
                    checked={settings.routing.preferScenic}
                    onCheckedChange={(v) => updateRouting('preferScenic', v)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Max Daily Distance: {settings.routing.maxDailyDistance} miles</Label>
                <Slider
                  value={[settings.routing.maxDailyDistance]}
                  onValueChange={([v]) => updateRouting('maxDailyDistance', v)}
                  min={100}
                  max={600}
                  step={50}
                />
              </div>

              <div className="space-y-2">
                <Label>Preferred Speed: {settings.routing.preferredSpeed} mph</Label>
                <Slider
                  value={[settings.routing.preferredSpeed]}
                  onValueChange={([v]) => updateRouting('preferredSpeed', v)}
                  min={45}
                  max={70}
                  step={5}
                />
              </div>
            </div>
          </TabsContent>

          {/* Display Settings */}
          <TabsContent value="display" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4" />
              <h3 className="font-medium">Display Preferences</h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="units">Units</Label>
                <Select 
                  value={settings.display.units} 
                  onValueChange={(v: 'imperial' | 'metric') => updateDisplay('units', v)}
                >
                  <SelectTrigger id="units">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imperial">Imperial (miles, feet)</SelectItem>
                    <SelectItem value="metric">Metric (km, meters)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="map-style">Default Map Style</Label>
                <Select 
                  value={settings.display.mapStyle} 
                  onValueChange={(v) => updateDisplay('mapStyle', v)}
                >
                  <SelectTrigger id="map-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="streets">Streets</SelectItem>
                    <SelectItem value="outdoors">Outdoors</SelectItem>
                    <SelectItem value="satellite">Satellite</SelectItem>
                    <SelectItem value="navigation">Navigation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="show-traffic">Show Traffic</Label>
                  <Switch
                    id="show-traffic"
                    checked={settings.display.showTraffic}
                    onCheckedChange={(v) => updateDisplay('showTraffic', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-weather">Show Weather</Label>
                  <Switch
                    id="show-weather"
                    checked={settings.display.showWeather}
                    onCheckedChange={(v) => updateDisplay('showWeather', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="show-pois">Show POIs</Label>
                  <Switch
                    id="show-pois"
                    checked={settings.display.showPOIs}
                    onCheckedChange={(v) => updateDisplay('showPOIs', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-zoom">Auto Zoom</Label>
                  <Switch
                    id="auto-zoom"
                    checked={settings.display.autoZoom}
                    onCheckedChange={(v) => updateDisplay('autoZoom', v)}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Voice Settings */}
          <TabsContent value="voice" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="h-4 w-4" />
              <h3 className="font-medium">Voice Navigation</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="voice-enabled">Enable Voice Navigation</Label>
                <Switch
                  id="voice-enabled"
                  checked={settings.voice.enabled}
                  onCheckedChange={(v) => updateVoice('enabled', v)}
                />
              </div>

              {settings.voice.enabled && (
                <>
                  <div className="space-y-2">
                    <Label>Volume: {settings.voice.volume}%</Label>
                    <Slider
                      value={[settings.voice.volume]}
                      onValueChange={([v]) => updateVoice('volume', v)}
                      min={0}
                      max={100}
                      step={10}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select 
                      value={settings.voice.language} 
                      onValueChange={(v) => updateVoice('language', v)}
                    >
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="en-GB">English (UK)</SelectItem>
                        <SelectItem value="es-ES">Spanish</SelectItem>
                        <SelectItem value="fr-FR">French</SelectItem>
                        <SelectItem value="de-DE">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="announce-streets">Announce Street Names</Label>
                    <Switch
                      id="announce-streets"
                      checked={settings.voice.announceStreetNames}
                      onCheckedChange={(v) => updateVoice('announceStreetNames', v)}
                    />
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* Fuel Settings */}
          <TabsContent value="fuel" className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="h-4 w-4" />
              <h3 className="font-medium">Fuel Management</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tank-size">Tank Size (gallons)</Label>
                  <Input
                    id="tank-size"
                    type="number"
                    value={settings.fuel.tankSize}
                    onChange={(e) => updateFuel('tankSize', parseFloat(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fuel-type">Fuel Type</Label>
                  <Select 
                    value={settings.fuel.fuelType} 
                    onValueChange={(v) => updateFuel('fuelType', v)}
                  >
                    <SelectTrigger id="fuel-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="plus">Plus</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="diesel">Diesel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Low Fuel Warning: {settings.fuel.warningLevel}%</Label>
                <Slider
                  value={[settings.fuel.warningLevel]}
                  onValueChange={([v]) => updateFuel('warningLevel', v)}
                  min={10}
                  max={50}
                  step={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="avg-price">Average Price per Gallon</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="avg-price"
                    type="number"
                    step="0.01"
                    value={settings.fuel.avgPrice}
                    onChange={(e) => updateFuel('avgPrice', parseFloat(e.target.value))}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}