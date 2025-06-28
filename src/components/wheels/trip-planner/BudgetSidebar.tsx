import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Fuel, 
  Tent, 
  UtensilsCrossed, 
  MapPin, 
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';

interface BudgetSidebarProps {
  directionsControl?: React.MutableRefObject<MapboxDirections | undefined>;
  isVisible: boolean;
  onClose: () => void;
}

interface BudgetSettings {
  totalBudget: number;
  fuelMpg: number;
  fuelPrice: number;
  campgroundCostPerNight: number;
  foodCostPerDay: number;
  activityBudgetPerDay: number;
  tripDurationDays: number;
}

interface CostBreakdown {
  fuel: number;
  campground: number;
  food: number;
  activities: number;
  total: number;
}

export default function BudgetSidebar({ directionsControl, isVisible, onClose }: BudgetSidebarProps) {
  const [settings, setSettings] = useState<BudgetSettings>({
    totalBudget: 1500,
    fuelMpg: 8,
    fuelPrice: 3.50,
    campgroundCostPerNight: 35,
    foodCostPerDay: 50,
    activityBudgetPerDay: 75,
    tripDurationDays: 7,
  });

  const [routeData, setRouteData] = useState<{
    distance: number;
    duration: number;
  }>({
    distance: 0,
    duration: 0,
  });

  // Extract route data from directions control
  useEffect(() => {
    if (directionsControl?.current) {
      const updateRouteData = () => {
        try {
          const route = directionsControl.current?.getRoute();
          if (route && route.legs) {
            const totalDistance = route.legs.reduce((sum, leg) => sum + (leg.distance || 0), 0);
            const totalDuration = route.legs.reduce((sum, leg) => sum + (leg.duration || 0), 0);
            
            setRouteData({
              distance: totalDistance / 1000, // Convert to km
              duration: totalDuration / 3600, // Convert to hours
            });
          }
        } catch (error) {
          console.warn('Error extracting route data:', error);
        }
      };

      directionsControl.current.on?.('route', updateRouteData);
      updateRouteData(); // Initial update

      return () => {
        directionsControl.current?.off?.('route', updateRouteData);
      };
    }
  }, [directionsControl]);

  // Calculate costs based on route and settings
  const costBreakdown = useMemo((): CostBreakdown => {
    const distanceMiles = routeData.distance * 0.621371; // Convert km to miles
    
    const fuel = (distanceMiles / settings.fuelMpg) * settings.fuelPrice;
    const campground = settings.campgroundCostPerNight * (settings.tripDurationDays - 1); // Assuming last night at home
    const food = settings.foodCostPerDay * settings.tripDurationDays;
    const activities = settings.activityBudgetPerDay * settings.tripDurationDays;
    
    return {
      fuel: Math.round(fuel * 100) / 100,
      campground: Math.round(campground * 100) / 100,
      food: Math.round(food * 100) / 100,
      activities: Math.round(activities * 100) / 100,
      total: Math.round((fuel + campground + food + activities) * 100) / 100,
    };
  }, [routeData, settings]);

  const budgetStatus = useMemo(() => {
    const remaining = settings.totalBudget - costBreakdown.total;
    const percentage = (costBreakdown.total / settings.totalBudget) * 100;
    
    return {
      remaining,
      percentage: Math.min(percentage, 100),
      isOverBudget: costBreakdown.total > settings.totalBudget,
      isNearLimit: percentage > 85 && percentage <= 100,
    };
  }, [settings.totalBudget, costBreakdown.total]);

  const pamSuggestions = useMemo(() => {
    const suggestions = [];
    
    if (budgetStatus.isOverBudget) {
      suggestions.push({
        type: 'cost-reduction',
        title: 'Reduce Campground Costs',
        description: `Try boondocking or state parks to save ~$${Math.round((settings.campgroundCostPerNight - 15) * (settings.tripDurationDays - 1))}`,
        icon: Tent,
        color: 'text-red-600',
      });
      
      suggestions.push({
        type: 'route-optimization',
        title: 'Optimize Route',
        description: 'Consider a more direct route to reduce fuel costs',
        icon: Fuel,
        color: 'text-orange-600',
      });
    }
    
    if (costBreakdown.fuel > costBreakdown.total * 0.4) {
      suggestions.push({
        type: 'fuel-efficiency',
        title: 'Improve Fuel Efficiency',
        description: 'Reduce speed by 5-10 mph to improve MPG by 15-20%',
        icon: TrendingDown,
        color: 'text-blue-600',
      });
    }

    if (budgetStatus.remaining > 200) {
      suggestions.push({
        type: 'upgrade-opportunity',
        title: 'Upgrade Opportunities',
        description: `You have $${Math.round(budgetStatus.remaining)} remaining for activities or better campsites`,
        icon: TrendingUp,
        color: 'text-green-600',
      });
    }

    return suggestions;
  }, [budgetStatus, costBreakdown, settings]);

  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-md bg-white border shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Budget Intelligence
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Total Trip Cost */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-3xl font-bold text-primary">
            ${costBreakdown.total.toLocaleString()}
          </div>
          <div className="text-sm text-muted-foreground">Total Trip Cost</div>
          <div className="flex items-center justify-center gap-2 mt-2">
            {budgetStatus.isOverBudget ? (
              <>
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <Badge variant="destructive">Over Budget</Badge>
              </>
            ) : budgetStatus.isNearLimit ? (
              <>
                <AlertTriangle className="w-4 h-4 text-yellow-500" />
                <Badge variant="secondary">Near Limit</Badge>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  On Track
                </Badge>
              </>
            )}
          </div>
        </div>

        {/* Budget Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Budget Used</span>
            <span>${costBreakdown.total} / ${settings.totalBudget}</span>
          </div>
          <Progress 
            value={budgetStatus.percentage} 
            className={`h-3 ${budgetStatus.isOverBudget ? 'bg-red-100' : budgetStatus.isNearLimit ? 'bg-yellow-100' : 'bg-green-100'}`}
          />
          <div className="text-xs text-muted-foreground mt-1">
            {budgetStatus.isOverBudget 
              ? `$${Math.abs(budgetStatus.remaining)} over budget`
              : `$${budgetStatus.remaining} remaining`
            }
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="space-y-3">
          <h4 className="font-medium">Cost Breakdown</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between p-2 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <Fuel className="w-4 h-4 text-blue-600" />
                <span className="text-sm">Fuel ({Math.round(routeData.distance)} km)</span>
              </div>
              <span className="font-medium">${costBreakdown.fuel}</span>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <Tent className="w-4 h-4 text-green-600" />
                <span className="text-sm">Campgrounds ({settings.tripDurationDays - 1} nights)</span>
              </div>
              <span className="font-medium">${costBreakdown.campground}</span>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-orange-600" />
                <span className="text-sm">Food ({settings.tripDurationDays} days)</span>
              </div>
              <span className="font-medium">${costBreakdown.food}</span>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded bg-muted/50">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span className="text-sm">Activities ({settings.tripDurationDays} days)</span>
              </div>
              <span className="font-medium">${costBreakdown.activities}</span>
            </div>
          </div>
        </div>

        {/* Budget Settings (Collapsible) */}
        <div className="space-y-3">
          <h4 className="font-medium">Settings</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <Label>Total Budget</Label>
              <Input
                type="number"
                value={settings.totalBudget}
                onChange={(e) => setSettings(prev => ({ ...prev, totalBudget: Number(e.target.value) }))}
                className="h-8"
              />
            </div>
            <div>
              <Label>Trip Days</Label>
              <Input
                type="number"
                value={settings.tripDurationDays}
                onChange={(e) => setSettings(prev => ({ ...prev, tripDurationDays: Number(e.target.value) }))}
                className="h-8"
              />
            </div>
            <div>
              <Label>RV MPG</Label>
              <Input
                type="number"
                step="0.1"
                value={settings.fuelMpg}
                onChange={(e) => setSettings(prev => ({ ...prev, fuelMpg: Number(e.target.value) }))}
                className="h-8"
              />
            </div>
            <div>
              <Label>Fuel $/gal</Label>
              <Input
                type="number"
                step="0.01"
                value={settings.fuelPrice}
                onChange={(e) => setSettings(prev => ({ ...prev, fuelPrice: Number(e.target.value) }))}
                className="h-8"
              />
            </div>
            <div>
              <Label>Camp $/night</Label>
              <Input
                type="number"
                value={settings.campgroundCostPerNight}
                onChange={(e) => setSettings(prev => ({ ...prev, campgroundCostPerNight: Number(e.target.value) }))}
                className="h-8"
              />
            </div>
            <div>
              <Label>Food $/day</Label>
              <Input
                type="number"
                value={settings.foodCostPerDay}
                onChange={(e) => setSettings(prev => ({ ...prev, foodCostPerDay: Number(e.target.value) }))}
                className="h-8"
              />
            </div>
          </div>
        </div>

        {/* PAM AI Suggestions */}
        {pamSuggestions.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium">PAM Suggestions</h4>
            <div className="space-y-2">
              {pamSuggestions.map((suggestion, index) => (
                <div key={index} className="p-3 border rounded-lg bg-background">
                  <div className="flex items-start gap-2">
                    <suggestion.icon className={`w-4 h-4 mt-0.5 ${suggestion.color}`} />
                    <div className="flex-1">
                      <div className="font-medium text-sm">{suggestion.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {suggestion.description}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}