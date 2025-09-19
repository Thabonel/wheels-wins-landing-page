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
  TrendingDown,
  XCircle,
  Mountain,
  Settings,
  MessageSquare,
  X,
  Brain,
  Sparkles,
  Target
} from 'lucide-react';
import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import {
  BudgetCalculator,
  BudgetSettings,
  RouteData,
  CostBreakdown,
  BudgetStatus,
  PAMSuggestion
} from './services/BudgetCalculator';
import { Waypoint } from './types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { aiBudgetAssistant } from '@/services/ml/aiBudgetAssistant';

interface BudgetSidebarProps {
  directionsControl?: React.MutableRefObject<MapboxDirections | undefined>;
  isVisible: boolean;
  onClose: () => void;
  waypoints?: Waypoint[];
}

const iconMap = {
  'check-circle': CheckCircle,
  'alert-triangle': AlertTriangle,
  'x-circle': XCircle,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'tent': Tent,
  'mountain': Mountain,
  'route': MapPin,
};

export default function BudgetSidebar({
  directionsControl,
  isVisible,
  onClose,
  waypoints = []
}: BudgetSidebarProps) {
  const { user } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState<any[]>([]);
  const [loadingAiRecommendations, setLoadingAiRecommendations] = useState(false);
  const [settings, setSettings] = useState<BudgetSettings>({
    totalBudget: 1500,
    fuelPrice: 3.89,
    campgroundCostPerNight: 90,
    foodCostPerDay: 14,
    activityBudgetPerDay: 25,
    tripDurationDays: 9,
    rvProfile: {
      mpg: 8.5,
      fuelTankCapacity: 100,
      preferredDailyDistance: 300,
      vehicleType: 'motorhome',
    },
  });

  const [routeData, setRouteData] = useState<RouteData>({
    distance: 2850 * 1.60934, // Default 2850 miles in km for demo
    duration: 45, // hours
    waypoints,
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
              waypoints,
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
  }, [directionsControl, waypoints]);

  // Calculate costs and budget status
  const costBreakdown = useMemo((): CostBreakdown => {
    return BudgetCalculator.calculateCosts(routeData, settings);
  }, [routeData, settings]);

  const budgetStatus = useMemo((): BudgetStatus => {
    return BudgetCalculator.calculateBudgetStatus(costBreakdown.total, settings.totalBudget);
  }, [costBreakdown.total, settings.totalBudget]);

  const pamSuggestions = useMemo((): PAMSuggestion[] => {
    return BudgetCalculator.generatePAMSuggestions(costBreakdown, budgetStatus, settings, routeData);
  }, [costBreakdown, budgetStatus, settings, routeData]);

  // Load AI Budget Recommendations
  useEffect(() => {
    const loadAiRecommendations = async () => {
      if (!user?.id) return;

      setLoadingAiRecommendations(true);
      try {
        const suggestions = await aiBudgetAssistant.getOptimizationSuggestions(user.id);
        setAiRecommendations(suggestions.quick_wins || []);
      } catch (error) {
        console.error('Error loading AI budget recommendations:', error);
        setAiRecommendations([]);
      } finally {
        setLoadingAiRecommendations(false);
      }
    };

    if (isVisible && user?.id) {
      loadAiRecommendations();
    }
  }, [isVisible, user?.id, costBreakdown.total]); // Refresh when trip cost changes

  const StatusIcon = iconMap[BudgetCalculator.getStatusIcon(budgetStatus.status) as keyof typeof iconMap];
  const statusColor = BudgetCalculator.getStatusColor(budgetStatus.status);

  return (
    <Card className="w-full bg-white border shadow-lg h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Trip Budget Tracker
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8 p-0"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Total Trip Cost Header */}
        <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border">
          <div className="text-4xl font-bold text-primary mb-2">
            {BudgetCalculator.formatCurrency(costBreakdown.total)}
          </div>
          <div className="text-sm text-muted-foreground mb-3">Total Trip Cost</div>
          <div className="flex items-center justify-center gap-2">
            <StatusIcon className={cn("w-5 h-5", statusColor)} />
            <Badge 
              variant={budgetStatus.status === 'under_budget' ? 'secondary' : 'destructive'}
              className={cn(
                "font-medium",
                budgetStatus.status === 'under_budget' && "bg-green-100 text-green-700 hover:bg-green-100",
                budgetStatus.status === 'near_limit' && "bg-yellow-100 text-yellow-700 hover:bg-yellow-100"
              )}
            >
              {budgetStatus.status === 'under_budget' && 'Under Budget'}
              {budgetStatus.status === 'near_limit' && 'Near Limit'}
              {budgetStatus.status === 'over_budget' && 'Over Budget'}
            </Badge>
          </div>
        </div>

        {/* Budget Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Budget Progress</span>
            <span className="text-muted-foreground">
              {BudgetCalculator.formatCurrency(costBreakdown.total)} / {BudgetCalculator.formatCurrency(settings.totalBudget)}
            </span>
          </div>
          <Progress 
            value={budgetStatus.percentage} 
            className={cn(
              "h-3",
              budgetStatus.status === 'over_budget' && "[&>div]:bg-red-500",
              budgetStatus.status === 'near_limit' && "[&>div]:bg-yellow-500",
              budgetStatus.status === 'under_budget' && "[&>div]:bg-green-500"
            )}
          />
          <div className="text-xs text-muted-foreground">
            {budgetStatus.isOverBudget 
              ? `${BudgetCalculator.formatCurrency(Math.abs(budgetStatus.remaining))} over budget`
              : `${BudgetCalculator.formatCurrency(budgetStatus.remaining)} remaining`
            }
          </div>
        </div>

        {/* Detailed Cost Breakdown */}
        <div className="space-y-4">
          <h4 className="font-semibold text-base flex items-center gap-2">
            💰 Cost Breakdown
          </h4>
          
          <div className="space-y-3">
            {/* Fuel Costs */}
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <Fuel className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">🛣️ Fuel</span>
                </div>
                <span className="text-lg font-bold text-blue-700">
                  {BudgetCalculator.formatCurrency(costBreakdown.fuel.cost)}
                </span>
              </div>
              <div className="text-xs text-blue-600 ml-10">
                {costBreakdown.fuel.details}
              </div>
              <Progress 
                value={(costBreakdown.fuel.cost / costBreakdown.total) * 100} 
                className="mt-2 h-2 bg-blue-100 [&>div]:bg-blue-500"
              />
            </div>

            {/* Campground Costs */}
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <Tent className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">🏕️ Campgrounds</span>
                </div>
                <span className="text-lg font-bold text-green-700">
                  {BudgetCalculator.formatCurrency(costBreakdown.campground.cost)}
                </span>
              </div>
              <div className="text-xs text-green-600 ml-10">
                {costBreakdown.campground.details}
              </div>
              <Progress 
                value={(costBreakdown.campground.cost / costBreakdown.total) * 100} 
                className="mt-2 h-2 bg-green-100 [&>div]:bg-green-500"
              />
            </div>

            {/* Food Costs */}
            <div className="p-4 rounded-lg bg-orange-50 border border-orange-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <UtensilsCrossed className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">🍽️ Food</span>
                </div>
                <span className="text-lg font-bold text-orange-700">
                  {BudgetCalculator.formatCurrency(costBreakdown.food.cost)}
                </span>
              </div>
              <div className="text-xs text-orange-600 ml-10">
                {costBreakdown.food.details}
              </div>
              <Progress 
                value={(costBreakdown.food.cost / costBreakdown.total) * 100} 
                className="mt-2 h-2 bg-orange-100 [&>div]:bg-orange-500"
              />
            </div>

            {/* Activities */}
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium">🎯 Activities</span>
                </div>
                <span className="text-lg font-bold text-purple-700">
                  {BudgetCalculator.formatCurrency(costBreakdown.activities.cost)}
                </span>
              </div>
              <div className="text-xs text-purple-600 ml-10">
                {costBreakdown.activities.details}
              </div>
              <Progress 
                value={(costBreakdown.activities.cost / costBreakdown.total) * 100} 
                className="mt-2 h-2 bg-purple-100 [&>div]:bg-purple-500"
              />
            </div>
          </div>
        </div>

        {/* AI Budget Recommendations */}
        {(aiRecommendations.length > 0 || loadingAiRecommendations) && (
          <div className="space-y-4">
            <h4 className="font-semibold text-base flex items-center gap-2">
              <Brain className="w-4 h-4 text-blue-600" />
              🧠 AI Budget Optimizer
            </h4>
            {loadingAiRecommendations ? (
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-sm text-blue-700">Analyzing your budget patterns...</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {aiRecommendations.map((recommendation, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Target className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-blue-700 mb-1">
                          {recommendation.title}
                        </div>
                        <div className="text-xs text-blue-600 mb-2">
                          {recommendation.description}
                        </div>
                        {recommendation.potential_savings > 0 && (
                          <div className="text-xs font-medium text-green-600 mb-2">
                            💰 Potential savings: ${recommendation.potential_savings.toFixed(2)}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs">
                          <Badge variant="outline" className="text-xs px-2 py-0.5">
                            {recommendation.implementation_difficulty || 'medium'} effort
                          </Badge>
                          <Badge variant="outline" className={cn(
                            "text-xs px-2 py-0.5",
                            recommendation.priority === 'high' && "border-red-200 text-red-700",
                            recommendation.priority === 'medium' && "border-yellow-200 text-yellow-700",
                            recommendation.priority === 'low' && "border-green-200 text-green-700"
                          )}>
                            {recommendation.priority || 'medium'} priority
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PAM AI Suggestions */}
        {pamSuggestions.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-semibold text-base flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              💡 PAM Suggests
            </h4>
            <div className="space-y-3">
              {pamSuggestions.map((suggestion, index) => (
                <div key={index} className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-primary mb-1">
                        "{suggestion.title}"
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {suggestion.description}
                      </div>
                      {suggestion.potentialSavings && (
                        <div className="text-xs font-medium text-green-600 mt-1">
                          Potential savings: {BudgetCalculator.formatCurrency(suggestion.potentialSavings)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <div className="space-y-4 p-4 bg-muted/50 rounded-lg border-t">
            <h4 className="font-medium">Budget Settings</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <Label className="text-xs">Total Budget</Label>
                <Input
                  type="number"
                  value={settings.totalBudget}
                  onChange={(e) => setSettings(prev => ({ ...prev, totalBudget: Number(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Trip Days</Label>
                <Input
                  type="number"
                  value={settings.tripDurationDays}
                  onChange={(e) => setSettings(prev => ({ ...prev, tripDurationDays: Number(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">RV MPG</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settings.rvProfile.mpg}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    rvProfile: { ...prev.rvProfile, mpg: Number(e.target.value) }
                  }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Fuel $/gal</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={settings.fuelPrice}
                  onChange={(e) => setSettings(prev => ({ ...prev, fuelPrice: Number(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Camp $/night</Label>
                <Input
                  type="number"
                  value={settings.campgroundCostPerNight}
                  onChange={(e) => setSettings(prev => ({ ...prev, campgroundCostPerNight: Number(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs">Food $/day</Label>
                <Input
                  type="number"
                  value={settings.foodCostPerDay}
                  onChange={(e) => setSettings(prev => ({ ...prev, foodCostPerDay: Number(e.target.value) }))}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}