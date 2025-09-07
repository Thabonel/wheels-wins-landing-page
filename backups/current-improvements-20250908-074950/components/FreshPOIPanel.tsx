import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';

interface FreshPOIPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: Record<string, boolean>;
  onFilterChange: (category: string, enabled: boolean) => void;
}

const POI_CATEGORIES = [
  { id: 'pet_stop', label: '🐾 Pet Stops', description: 'Dog parks, pet-friendly areas' },
  { id: 'wide_parking', label: '🅿️ Wide Parking', description: 'RV and caravan parking' },
  { id: 'medical', label: '🚑 Medical', description: 'Hospitals, clinics, pharmacies' },
  { id: 'farmers_market', label: '🥕 Farmers Markets', description: 'Fresh local produce' },
  { id: 'fuel', label: '⛽ Fuel Stations', description: 'Petrol stations, charging points' },
  { id: 'camping', label: '🏕️ Camping', description: 'Campgrounds, caravan parks' },
  { id: 'dump_station', label: '🚿 Dump Stations', description: 'Waste disposal facilities' },
  { id: 'water', label: '💧 Water Points', description: 'Fresh water fill stations' },
];

export default function FreshPOIPanel({ 
  isOpen, 
  onClose, 
  filters, 
  onFilterChange 
}: FreshPOIPanelProps) {
  if (!isOpen) return null;

  return (
    <Card className="absolute top-16 left-2 z-[10001] w-80 max-h-[calc(100vh-100px)] overflow-y-auto">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Points of Interest</CardTitle>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            aria-label="Close POI panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-gray-600">
          Select categories to show on the map
        </p>
        
        {POI_CATEGORIES.map((category) => (
          <div key={category.id} className="flex items-start space-x-3">
            <Checkbox
              id={category.id}
              checked={filters[category.id] || false}
              onCheckedChange={(checked) => 
                onFilterChange(category.id, checked as boolean)
              }
              className="mt-1"
            />
            <div className="flex-1">
              <Label 
                htmlFor={category.id} 
                className="text-sm font-medium cursor-pointer"
              >
                {category.label}
              </Label>
              <p className="text-xs text-gray-500 mt-0.5">
                {category.description}
              </p>
            </div>
          </div>
        ))}
        
        <div className="pt-3 border-t">
          <p className="text-xs text-gray-500">
            💡 Tip: Click on markers to see more details
          </p>
        </div>
      </CardContent>
    </Card>
  );
}