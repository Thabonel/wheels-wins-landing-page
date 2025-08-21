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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  MapPin, 
  Tent, 
  Fuel, 
  ShoppingCart, 
  Coffee,
  Camera,
  Trees,
  Wrench,
  Trash2,
  Droplets,
  Wifi,
  Dog,
  Zap,
  Home,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';

interface POIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (poi: POIData) => void;
  coordinates?: [number, number];
  existingPOI?: POIData;
}

interface POIData {
  id?: string;
  name: string;
  type: string;
  icon: string;
  description: string;
  coordinates: [number, number];
  amenities: string[];
  rating?: number;
  notes?: string;
  isPrivate: boolean;
  photos?: string[];
}

const POI_TYPES = [
  { value: 'campground', label: 'Campground', icon: Tent },
  { value: 'rv_park', label: 'RV Park', icon: Home },
  { value: 'gas_station', label: 'Gas Station', icon: Fuel },
  { value: 'dump_station', label: 'Dump Station', icon: Trash2 },
  { value: 'water', label: 'Water Fill', icon: Droplets },
  { value: 'grocery', label: 'Grocery Store', icon: ShoppingCart },
  { value: 'restaurant', label: 'Restaurant', icon: Coffee },
  { value: 'scenic', label: 'Scenic View', icon: Camera },
  { value: 'hiking', label: 'Hiking Trail', icon: Trees },
  { value: 'repair', label: 'RV Repair', icon: Wrench },
  { value: 'wifi', label: 'WiFi Spot', icon: Wifi },
  { value: 'dog_park', label: 'Dog Park', icon: Dog },
  { value: 'charging', label: 'EV Charging', icon: Zap },
  { value: 'favorite', label: 'Favorite Spot', icon: Heart },
  { value: 'other', label: 'Other', icon: MapPin }
];

const AMENITIES = [
  'Full Hookups',
  '30 Amp',
  '50 Amp',
  'Water',
  'Sewer',
  'WiFi',
  'Cell Service',
  'Laundry',
  'Showers',
  'Restrooms',
  'Dump Station',
  'Pet Friendly',
  'Pool',
  'Playground',
  'Store',
  'Propane',
  'Fire Rings',
  'Picnic Tables',
  'Level Sites',
  'Pull Through'
];

export default function POIModal({
  isOpen,
  onClose,
  onAdd,
  coordinates,
  existingPOI
}: POIModalProps) {
  const [poiName, setPoiName] = useState(existingPOI?.name || '');
  const [poiType, setPoiType] = useState(existingPOI?.type || 'campground');
  const [description, setDescription] = useState(existingPOI?.description || '');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(existingPOI?.amenities || []);
  const [rating, setRating] = useState(existingPOI?.rating?.toString() || '');
  const [notes, setNotes] = useState(existingPOI?.notes || '');
  const [isPrivate, setIsPrivate] = useState(existingPOI?.isPrivate ?? true);
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = async () => {
    if (!poiName.trim()) {
      toast.error('Please enter a POI name');
      return;
    }

    if (!coordinates && !existingPOI?.coordinates) {
      toast.error('No coordinates available for this POI');
      return;
    }

    setIsAdding(true);

    const poiData: POIData = {
      id: existingPOI?.id,
      name: poiName,
      type: poiType,
      icon: POI_TYPES.find(t => t.value === poiType)?.value || 'other',
      description,
      coordinates: coordinates || existingPOI!.coordinates,
      amenities: selectedAmenities,
      rating: rating ? parseFloat(rating) : undefined,
      notes,
      isPrivate
    };

    try {
      await onAdd(poiData);
      toast.success(existingPOI ? 'POI updated successfully!' : 'POI added successfully!');
      onClose();
      resetForm();
    } catch (error) {
      toast.error('Failed to save POI');
      console.error('Error saving POI:', error);
    } finally {
      setIsAdding(false);
    }
  };

  const resetForm = () => {
    if (!existingPOI) {
      setPoiName('');
      setPoiType('campground');
      setDescription('');
      setSelectedAmenities([]);
      setRating('');
      setNotes('');
      setIsPrivate(true);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity]
    );
  };

  const SelectedIcon = POI_TYPES.find(t => t.value === poiType)?.icon || MapPin;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SelectedIcon className="h-5 w-5" />
            {existingPOI ? 'Edit Point of Interest' : 'Add Point of Interest'}
          </DialogTitle>
          <DialogDescription>
            Mark important locations along your route
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* POI Name */}
          <div className="space-y-2">
            <Label htmlFor="poi-name">Name *</Label>
            <Input
              id="poi-name"
              placeholder="e.g., Beautiful Vista Campground"
              value={poiName}
              onChange={(e) => setPoiName(e.target.value)}
            />
          </div>

          {/* POI Type */}
          <div className="space-y-2">
            <Label htmlFor="poi-type">Type</Label>
            <Select value={poiType} onValueChange={setPoiType}>
              <SelectTrigger id="poi-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POI_TYPES.map(type => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What makes this place special?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Amenities (for campgrounds/RV parks) */}
          {(poiType === 'campground' || poiType === 'rv_park') && (
            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto p-2 border rounded-md">
                {AMENITIES.map(amenity => (
                  <label
                    key={amenity}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-muted p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAmenities.includes(amenity)}
                      onChange={() => toggleAmenity(amenity)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Rating */}
          <div className="space-y-2">
            <Label htmlFor="rating">Rating (1-5)</Label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger id="rating">
                <SelectValue placeholder="Select a rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No rating</SelectItem>
                <SelectItem value="1">⭐ - Poor</SelectItem>
                <SelectItem value="2">⭐⭐ - Fair</SelectItem>
                <SelectItem value="3">⭐⭐⭐ - Good</SelectItem>
                <SelectItem value="4">⭐⭐⭐⭐ - Very Good</SelectItem>
                <SelectItem value="5">⭐⭐⭐⭐⭐ - Excellent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Personal Notes</Label>
            <Textarea
              id="notes"
              placeholder="Any tips or reminders for yourself..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Privacy */}
          <div className="space-y-2">
            <Label>Visibility</Label>
            <RadioGroup value={isPrivate ? 'private' : 'public'} onValueChange={(v) => setIsPrivate(v === 'private')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="font-normal cursor-pointer">
                  Private - Only visible to you
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="font-normal cursor-pointer">
                  Public - Share with the community
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Coordinates Display */}
          {coordinates && (
            <div className="text-sm text-muted-foreground">
              📍 Location: {coordinates[1].toFixed(6)}, {coordinates[0].toFixed(6)}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isAdding}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={isAdding}>
            {isAdding ? 'Saving...' : (existingPOI ? 'Update POI' : 'Add POI')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}