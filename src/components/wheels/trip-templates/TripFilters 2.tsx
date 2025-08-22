import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { Filter, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { TripTemplate } from '@/services/tripTemplateService';

interface TripFiltersProps {
  filters: {
    duration: string;
    difficulty: string;
    category: string;
  };
  onChange: (filters: any) => void;
  templates: TripTemplate[];
}

export default function TripFilters({ filters, onChange, templates }: TripFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Extract unique categories from templates
  const categories = Array.from(new Set(templates.map(t => t.category))).sort();

  const durationOptions = [
    { value: 'all', label: 'Any Duration' },
    { value: '1-7', label: '1 Week or Less' },
    { value: '8-14', label: '1-2 Weeks' },
    { value: '15-30', label: '2-4 Weeks' },
    { value: '31-999', label: 'Over 1 Month' }
  ];

  const difficultyOptions = [
    { value: 'all', label: 'Any Difficulty' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ];

  const activeFilterCount = Object.values(filters).filter(v => v !== 'all').length;

  const handleFilterChange = (type: string, value: string) => {
    onChange({
      ...filters,
      [type]: value
    });
  };

  const clearFilters = () => {
    onChange({
      duration: 'all',
      difficulty: 'all',
      category: 'all'
    });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-between h-12">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <ChevronDown className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
          Filter Trips
          {activeFilterCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters}
              className="h-6 px-2 text-xs"
            >
              Clear all
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Duration Filter */}
        <DropdownMenuLabel className="text-xs text-gray-500 font-normal">Duration</DropdownMenuLabel>
        {durationOptions.map(option => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={filters.duration === option.value}
            onCheckedChange={() => handleFilterChange('duration', option.value)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />

        {/* Difficulty Filter */}
        <DropdownMenuLabel className="text-xs text-gray-500 font-normal">Difficulty</DropdownMenuLabel>
        {difficultyOptions.map(option => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={filters.difficulty === option.value}
            onCheckedChange={() => handleFilterChange('difficulty', option.value)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}

        <DropdownMenuSeparator />

        {/* Category Filter */}
        <DropdownMenuLabel className="text-xs text-gray-500 font-normal">Category</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={filters.category === 'all'}
          onCheckedChange={() => handleFilterChange('category', 'all')}
        >
          All Categories
        </DropdownMenuCheckboxItem>
        {categories.map(category => (
          <DropdownMenuCheckboxItem
            key={category}
            checked={filters.category === category}
            onCheckedChange={() => handleFilterChange('category', category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1).replace('-', ' ')}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}