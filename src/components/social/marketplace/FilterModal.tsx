import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export interface FilterOptions {
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  category?: string;
  location?: string;
}

const conditions = ["Excellent", "Good", "Fair", "Poor"];
const categories = ["Electronics", "Furniture", "Parts", "Camping", "Tools", "Other"];

export default function FilterModal({ isOpen, onClose, onApplyFilters, currentFilters }: FilterModalProps) {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters(filters);
    onClose();
  };

  const handleClear = () => {
    const emptyFilters = {};
    setFilters(emptyFilters);
    onApplyFilters(emptyFilters);
    onClose();
  };

  const removeFilter = (key: keyof FilterOptions) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    setFilters(newFilters);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Filter Listings</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Price Range */}
          <div className="space-y-2">
            <Label>Price Range</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Min $"
                value={filters.minPrice || ''}
                onChange={(e) => setFilters({ ...filters, minPrice: e.target.value ? Number(e.target.value) : undefined })}
              />
              <Input
                type="number"
                placeholder="Max $"
                value={filters.maxPrice || ''}
                onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value ? Number(e.target.value) : undefined })}
              />
            </div>
          </div>

          {/* Condition */}
          <div className="space-y-2">
            <Label>Condition</Label>
            <div className="flex flex-wrap gap-2">
              {conditions.map(condition => (
                <Badge
                  key={condition}
                  variant={filters.condition === condition ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFilters({ 
                    ...filters, 
                    condition: filters.condition === condition ? undefined : condition 
                  })}
                >
                  {condition}
                </Badge>
              ))}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Badge
                  key={category}
                  variant={filters.category === category ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setFilters({ 
                    ...filters, 
                    category: filters.category === category ? undefined : category 
                  })}
                >
                  {category}
                </Badge>
              ))}
            </div>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <Input
              placeholder="Enter location..."
              value={filters.location || ''}
              onChange={(e) => setFilters({ ...filters, location: e.target.value || undefined })}
            />
          </div>

          {/* Active Filters */}
          {Object.keys(filters).length > 0 && (
            <div className="space-y-2">
              <Label>Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {filters.minPrice && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Min: ${filters.minPrice}
                    <X size={12} className="cursor-pointer" onClick={() => removeFilter('minPrice')} />
                  </Badge>
                )}
                {filters.maxPrice && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    Max: ${filters.maxPrice}
                    <X size={12} className="cursor-pointer" onClick={() => removeFilter('maxPrice')} />
                  </Badge>
                )}
                {filters.condition && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {filters.condition}
                    <X size={12} className="cursor-pointer" onClick={() => removeFilter('condition')} />
                  </Badge>
                )}
                {filters.category && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {filters.category}
                    <X size={12} className="cursor-pointer" onClick={() => removeFilter('category')} />
                  </Badge>
                )}
                {filters.location && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {filters.location}
                    <X size={12} className="cursor-pointer" onClick={() => removeFilter('location')} />
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={handleClear} className="flex-1">
              Clear All
            </Button>
            <Button onClick={handleApply} className="flex-1">
              Apply Filters
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}