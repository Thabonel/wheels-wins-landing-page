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
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Save, Calendar as CalendarIcon, DollarSign, Users, Lock, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SaveRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tripData: TripData) => void;
  waypoints: any[];
  routeInfo?: {
    distance: number;
    duration: number;
  };
}

interface TripData {
  name: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
  isPublic: boolean;
  createBudget: boolean;
  budgetAmount?: number;
  tripType: string;
  tags: string[];
  waypoints: any[];
  routeInfo?: any;
}

export default function SaveRouteModal({
  isOpen,
  onClose,
  onSave,
  waypoints,
  routeInfo
}: SaveRouteModalProps) {
  const [tripName, setTripName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isPublic, setIsPublic] = useState(false);
  const [createBudget, setCreateBudget] = useState(false);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [tripType, setTripType] = useState('vacation');
  const [tags, setTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!tripName.trim()) {
      toast.error('Please enter a trip name');
      return;
    }

    if (createBudget && !budgetAmount) {
      toast.error('Please enter a budget amount');
      return;
    }

    setIsSaving(true);
    
    const tripData: TripData = {
      name: tripName,
      description,
      startDate,
      endDate,
      isPublic,
      createBudget,
      budgetAmount: createBudget ? parseFloat(budgetAmount) : undefined,
      tripType,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      waypoints,
      routeInfo
    };

    try {
      await onSave(tripData);
      toast.success('Trip saved successfully!');
      onClose();
      resetForm();
    } catch (error) {
      toast.error('Failed to save trip');
      console.error('Error saving trip:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setTripName('');
    setDescription('');
    setStartDate(undefined);
    setEndDate(undefined);
    setIsPublic(false);
    setCreateBudget(false);
    setBudgetAmount('');
    setTripType('vacation');
    setTags('');
  };

  // Calculate estimated fuel cost (rough estimate)
  const estimateFuelCost = () => {
    if (routeInfo?.distance) {
      const miles = routeInfo.distance * 0.621371; // Convert km to miles
      const mpg = 8; // Average RV MPG
      const gasPrice = 3.50; // Average gas price per gallon
      return (miles / mpg * gasPrice).toFixed(2);
    }
    return '0.00';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Save Trip Route
          </DialogTitle>
          <DialogDescription>
            Save your planned route with details and optional budget tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Trip Name */}
          <div className="space-y-2">
            <Label htmlFor="trip-name">Trip Name *</Label>
            <Input
              id="trip-name"
              placeholder="e.g., Summer Yellowstone Adventure"
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe your trip plans..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          {/* Trip Type */}
          <div className="space-y-2">
            <Label htmlFor="trip-type">Trip Type</Label>
            <Select value={tripType} onValueChange={setTripType}>
              <SelectTrigger id="trip-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vacation">Vacation</SelectItem>
                <SelectItem value="weekend">Weekend Getaway</SelectItem>
                <SelectItem value="fulltime">Full-time RVing</SelectItem>
                <SelectItem value="business">Business Travel</SelectItem>
                <SelectItem value="relocation">Relocation</SelectItem>
                <SelectItem value="seasonal">Seasonal Travel</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                    disabled={(date) => startDate ? date < startDate : false}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Route Summary */}
          {routeInfo && (
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <h4 className="font-medium text-sm">Route Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Distance:</span>
                  <span className="ml-2 font-medium">
                    {(routeInfo.distance * 0.621371).toFixed(1)} miles
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="ml-2 font-medium">
                    {Math.floor(routeInfo.duration / 3600)}h {Math.floor((routeInfo.duration % 3600) / 60)}m
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Waypoints:</span>
                  <span className="ml-2 font-medium">{waypoints.length}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Est. Fuel Cost:</span>
                  <span className="ml-2 font-medium">${estimateFuelCost()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Wheels & Wins Integration */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium">Wheels & Wins Features</h4>
            
            {/* Create Budget */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="create-budget" className="text-sm font-medium">
                  <DollarSign className="inline h-4 w-4 mr-1" />
                  Create Trip Budget
                </Label>
                <p className="text-xs text-muted-foreground">
                  Track expenses for this trip
                </p>
              </div>
              <Switch
                id="create-budget"
                checked={createBudget}
                onCheckedChange={setCreateBudget}
              />
            </div>

            {createBudget && (
              <div className="space-y-2 ml-6">
                <Label htmlFor="budget-amount">Budget Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="budget-amount"
                    type="number"
                    placeholder="0.00"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
            )}

            {/* Public/Private Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-public" className="text-sm font-medium">
                  {isPublic ? (
                    <>
                      <Globe className="inline h-4 w-4 mr-1" />
                      Public Trip
                    </>
                  ) : (
                    <>
                      <Lock className="inline h-4 w-4 mr-1" />
                      Private Trip
                    </>
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? 'Share with the community' : 'Only you can see this trip'}
                </p>
              </div>
              <Switch
                id="is-public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              placeholder="e.g., national-parks, boondocking, pet-friendly"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Separate tags with commas
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Trip'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}