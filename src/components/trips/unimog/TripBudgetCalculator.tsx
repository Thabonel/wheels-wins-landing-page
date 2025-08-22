import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, 
  Fuel, 
  Home, 
  ShoppingBasket,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Calculator
} from 'lucide-react';
import { BudgetCalculator, BudgetSettings, CostBreakdown } from '@/components/wheels/trip-planner/services/BudgetCalculator';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TripBudgetCalculatorProps {
  isOpen: boolean;
  onClose?: () => void;
  routeData?: {
    distance: number; // in meters
    duration: number; // in seconds
    waypoints: any[];
  };
  onSaveBudget?: (budget: BudgetSettings) => void;
  className?: string;
}

export default function TripBudgetCalculator({
  isOpen,
  onClose,
  routeData,
  onSaveBudget,
  className
}: TripBudgetCalculatorProps) {
  const [totalBudget, setTotalBudget] = useState(2000);
  const [fuelPrice, setFuelPrice] = useState(3.50);
  const [campgroundCost, setCampgroundCost] = useState(35);
  const [foodCost, setFoodCost] = useState(75);
  const [activityBudget, setActivityBudget] = useState(50);
  const [tripDays, setTripDays] = useState(7);
  const [mpg, setMpg] = useState(8.5);

  const calculateCosts = useMemo(() => {
    if (!routeData) return null;

    const settings: BudgetSettings = {
      totalBudget,
      fuelPrice,
      campgroundCostPerNight: campgroundCost,
      foodCostPerDay: foodCost,
      activityBudgetPerDay: activityBudget,
      tripDurationDays: tripDays,
      rvProfile: {
        mpg,
        fuelTankCapacity: 100,
        preferredDailyDistance: 300,
        vehicleType: 'motorhome'
      }
    };

    const breakdown = BudgetCalculator.calculateCosts(
      {
        distance: routeData.distance / 1000, // Convert meters to km
        duration: routeData.duration / 3600, // Convert seconds to hours
        waypoints: routeData.waypoints
      },
      settings
    );

    return breakdown;
  }, [routeData, totalBudget, fuelPrice, campgroundCost, foodCost, activityBudget, tripDays, mpg]);

  const budgetStatus = useMemo(() => {
    if (!calculateCosts) return null;
    
    const remaining = totalBudget - calculateCosts.total;
    const percentage = (calculateCosts.total / totalBudget) * 100;
    
    return {
      remaining,
      percentage: Math.min(percentage, 100),
      isOverBudget: remaining < 0,
      isNearLimit: percentage > 80 && percentage <= 100,
      status: remaining < 0 ? 'over' : percentage > 80 ? 'warning' : 'good'
    };
  }, [totalBudget, calculateCosts]);

  const handleSaveBudget = () => {
    const settings: BudgetSettings = {
      totalBudget,
      fuelPrice,
      campgroundCostPerNight: campgroundCost,
      foodCostPerDay: foodCost,
      activityBudgetPerDay: activityBudget,
      tripDurationDays: tripDays,
      rvProfile: {
        mpg,
        fuelTankCapacity: 100,
        preferredDailyDistance: 300,
        vehicleType: 'motorhome'
      }
    };
    
    if (onSaveBudget) {
      onSaveBudget(settings);
    }
    
    toast.success('Budget saved for this trip!');
  };

  if (!isOpen) return null;

  return (
    <Card className={cn(
      "absolute left-4 bottom-20 w-96 max-h-[600px] overflow-y-auto z-40",
      "shadow-xl border-2",
      className
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Trip Budget Calculator
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              ×
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Total Budget */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Total Trip Budget
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">${totalBudget}</span>
            <Slider
              value={[totalBudget]}
              onValueChange={([v]) => setTotalBudget(v)}
              min={500}
              max={10000}
              step={100}
              className="flex-1"
            />
          </div>
        </div>

        {/* Trip Duration */}
        <div className="space-y-2">
          <Label>Trip Duration (Days)</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={tripDays}
              onChange={(e) => setTripDays(parseInt(e.target.value) || 1)}
              className="w-20"
              min={1}
              max={365}
            />
            <span className="text-sm text-muted-foreground">days</span>
          </div>
        </div>

        {/* Cost Inputs Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Fuel className="h-3 w-3" />
              Fuel Price ($/gal)
            </Label>
            <Input
              type="number"
              value={fuelPrice}
              onChange={(e) => setFuelPrice(parseFloat(e.target.value) || 0)}
              step={0.01}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Home className="h-3 w-3" />
              Campground ($/night)
            </Label>
            <Input
              type="number"
              value={campgroundCost}
              onChange={(e) => setCampgroundCost(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <ShoppingBasket className="h-3 w-3" />
              Food ($/day)
            </Label>
            <Input
              type="number"
              value={foodCost}
              onChange={(e) => setFoodCost(parseFloat(e.target.value) || 0)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Activities ($/day)
            </Label>
            <Input
              type="number"
              value={activityBudget}
              onChange={(e) => setActivityBudget(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        {/* RV MPG */}
        <div className="space-y-2">
          <Label className="text-xs">RV Fuel Economy (MPG)</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{mpg}</span>
            <Slider
              value={[mpg]}
              onValueChange={([v]) => setMpg(v)}
              min={5}
              max={15}
              step={0.5}
              className="flex-1"
            />
          </div>
        </div>

        {/* Cost Breakdown */}
        {calculateCosts && (
          <>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Cost Breakdown</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Fuel className="h-3 w-3" />
                    Fuel ({calculateCosts.fuel.gallons.toFixed(1)} gal)
                  </span>
                  <span className="font-medium">${calculateCosts.fuel.cost.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Home className="h-3 w-3" />
                    Campgrounds ({calculateCosts.campground.nights} nights)
                  </span>
                  <span className="font-medium">${calculateCosts.campground.cost.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <ShoppingBasket className="h-3 w-3" />
                    Food ({calculateCosts.food.days} days)
                  </span>
                  <span className="font-medium">${calculateCosts.food.cost.toFixed(2)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <Activity className="h-3 w-3" />
                    Activities
                  </span>
                  <span className="font-medium">${calculateCosts.activities.cost.toFixed(2)}</span>
                </div>

                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total Cost</span>
                  <span className="text-lg">${calculateCosts.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Budget Status */}
            {budgetStatus && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Budget Status</span>
                  <div className={cn(
                    "flex items-center gap-1",
                    budgetStatus.status === 'good' && "text-green-600",
                    budgetStatus.status === 'warning' && "text-yellow-600",
                    budgetStatus.status === 'over' && "text-red-600"
                  )}>
                    {budgetStatus.status === 'good' && <CheckCircle className="h-4 w-4" />}
                    {budgetStatus.status === 'warning' && <AlertCircle className="h-4 w-4" />}
                    {budgetStatus.status === 'over' && <AlertCircle className="h-4 w-4" />}
                    <span className="text-sm font-medium">
                      {budgetStatus.status === 'good' && 'Under Budget'}
                      {budgetStatus.status === 'warning' && 'Near Limit'}
                      {budgetStatus.status === 'over' && 'Over Budget'}
                    </span>
                  </div>
                </div>

                <Progress 
                  value={budgetStatus.percentage} 
                  className={cn(
                    "h-2",
                    budgetStatus.status === 'good' && "[&>div]:bg-green-600",
                    budgetStatus.status === 'warning' && "[&>div]:bg-yellow-600",
                    budgetStatus.status === 'over' && "[&>div]:bg-red-600"
                  )}
                />

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {budgetStatus.remaining >= 0 ? 'Remaining' : 'Over by'}
                  </span>
                  <span className={cn(
                    "font-medium",
                    budgetStatus.remaining >= 0 ? "text-green-600" : "text-red-600"
                  )}>
                    ${Math.abs(budgetStatus.remaining).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Save Button */}
        <Button 
          onClick={handleSaveBudget}
          className="w-full"
          disabled={!calculateCosts}
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Save Budget for Trip
        </Button>

        {/* PAM Tips */}
        {budgetStatus?.status === 'over' && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm">
            <p className="font-medium text-red-800 dark:text-red-300 mb-1">
              💡 PAM's Budget Tips:
            </p>
            <ul className="space-y-1 text-red-700 dark:text-red-400">
              <li>• Consider free camping/boondocking options</li>
              <li>• Look for fuel apps to find cheaper stations</li>
              <li>• Cook more meals instead of dining out</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}