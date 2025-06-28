import { Waypoint } from '../types';

export interface RVProfile {
  mpg: number;
  fuelTankCapacity: number;
  preferredDailyDistance: number;
  vehicleType: 'motorhome' | 'travel_trailer' | 'fifth_wheel';
}

export interface BudgetSettings {
  totalBudget: number;
  fuelPrice: number;
  campgroundCostPerNight: number;
  foodCostPerDay: number;
  activityBudgetPerDay: number;
  tripDurationDays: number;
  rvProfile: RVProfile;
}

export interface RouteData {
  distance: number; // in kilometers
  duration: number; // in hours
  waypoints: Waypoint[];
}

export interface CostBreakdown {
  fuel: {
    cost: number;
    gallons: number;
    details: string;
  };
  campground: {
    cost: number;
    nights: number;
    details: string;
  };
  food: {
    cost: number;
    days: number;
    details: string;
  };
  activities: {
    cost: number;
    count: number;
    details: string;
  };
  total: number;
}

export interface BudgetStatus {
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  isNearLimit: boolean;
  status: 'under_budget' | 'near_limit' | 'over_budget';
}

export interface PAMSuggestion {
  type: 'cost_reduction' | 'route_optimization' | 'fuel_efficiency' | 'upgrade_opportunity' | 'alternative_camping';
  title: string;
  description: string;
  potentialSavings?: number;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  color: string;
}

export class BudgetCalculator {
  private static readonly MILES_PER_KM = 0.621371;
  private static readonly DEFAULT_RV_PROFILE: RVProfile = {
    mpg: 8.5,
    fuelTankCapacity: 100,
    preferredDailyDistance: 300,
    vehicleType: 'motorhome',
  };

  static calculateCosts(
    routeData: RouteData,
    settings: BudgetSettings
  ): CostBreakdown {
    const distanceMiles = routeData.distance * this.MILES_PER_KM;
    const rvProfile = settings.rvProfile || this.DEFAULT_RV_PROFILE;

    // Fuel calculation: (distance / mpg) * fuel_price
    const gallonsNeeded = distanceMiles / rvProfile.mpg;
    const fuelCost = gallonsNeeded * settings.fuelPrice;

    // Campground calculation: nights * avg_price_per_night
    const nights = Math.max(0, settings.tripDurationDays - 1); // Assuming last night at home
    const campgroundCost = nights * settings.campgroundCostPerNight;

    // Food calculation: days * daily_food_budget
    const foodCost = settings.tripDurationDays * settings.foodCostPerDay;

    // Activities calculation based on waypoints and trip duration
    const activityCount = Math.max(routeData.waypoints.length, Math.floor(settings.tripDurationDays / 2));
    const activitiesCost = settings.activityBudgetPerDay * settings.tripDurationDays;

    const total = fuelCost + campgroundCost + foodCost + activitiesCost;

    return {
      fuel: {
        cost: Math.round(fuelCost * 100) / 100,
        gallons: Math.round(gallonsNeeded * 10) / 10,
        details: `${Math.round(distanceMiles)} miles × ${rvProfile.mpg} MPG × $${settings.fuelPrice}/gal`,
      },
      campground: {
        cost: Math.round(campgroundCost * 100) / 100,
        nights,
        details: `${nights} nights × $${settings.campgroundCostPerNight} avg/night`,
      },
      food: {
        cost: Math.round(foodCost * 100) / 100,
        days: settings.tripDurationDays,
        details: `${settings.tripDurationDays} days × $${settings.foodCostPerDay}/day`,
      },
      activities: {
        cost: Math.round(activitiesCost * 100) / 100,
        count: activityCount,
        details: `${settings.tripDurationDays} days × $${settings.activityBudgetPerDay}/day`,
      },
      total: Math.round(total * 100) / 100,
    };
  }

  static calculateBudgetStatus(
    totalCost: number,
    totalBudget: number
  ): BudgetStatus {
    const remaining = totalBudget - totalCost;
    const percentage = Math.min((totalCost / totalBudget) * 100, 100);
    const isOverBudget = totalCost > totalBudget;
    const isNearLimit = percentage > 85 && percentage <= 100;

    let status: BudgetStatus['status'] = 'under_budget';
    if (isOverBudget) status = 'over_budget';
    else if (isNearLimit) status = 'near_limit';

    return {
      remaining: Math.round(remaining * 100) / 100,
      percentage: Math.round(percentage * 100) / 100,
      isOverBudget,
      isNearLimit,
      status,
    };
  }

  static generatePAMSuggestions(
    costBreakdown: CostBreakdown,
    budgetStatus: BudgetStatus,
    settings: BudgetSettings,
    routeData: RouteData
  ): PAMSuggestion[] {
    const suggestions: PAMSuggestion[] = [];

    // Over budget suggestions
    if (budgetStatus.isOverBudget) {
      const overage = Math.abs(budgetStatus.remaining);
      
      suggestions.push({
        type: 'alternative_camping',
        title: 'Switch to State Parks',
        description: `Use state parks for 3 nights? Save ~$${Math.round((settings.campgroundCostPerNight - 25) * 3)}`,
        potentialSavings: (settings.campgroundCostPerNight - 25) * 3,
        priority: 'high',
        icon: 'tent',
        color: 'text-green-600',
      });

      if (costBreakdown.fuel.cost > costBreakdown.total * 0.4) {
        suggestions.push({
          type: 'route_optimization',
          title: 'Optimize Route',
          description: 'Consider a more direct route to reduce fuel costs',
          potentialSavings: costBreakdown.fuel.cost * 0.15,
          priority: 'high',
          icon: 'route',
          color: 'text-blue-600',
        });
      }
    }

    // Fuel efficiency suggestions
    if (costBreakdown.fuel.cost > costBreakdown.total * 0.35) {
      suggestions.push({
        type: 'fuel_efficiency',
        title: 'Improve Fuel Efficiency',
        description: 'Reduce speed by 5-10 mph to improve MPG by 15-20%',
        potentialSavings: costBreakdown.fuel.cost * 0.18,
        priority: 'medium',
        icon: 'trending-down',
        color: 'text-orange-600',
      });
    }

    // Boondocking suggestions
    if (costBreakdown.campground.cost > 200 && !budgetStatus.isOverBudget) {
      suggestions.push({
        type: 'cost_reduction',
        title: 'Try Boondocking',
        description: `Free camping 2 nights could save $${settings.campgroundCostPerNight * 2}`,
        potentialSavings: settings.campgroundCostPerNight * 2,
        priority: 'medium',
        icon: 'mountain',
        color: 'text-green-600',
      });
    }

    // Upgrade opportunities
    if (budgetStatus.remaining > 200 && !budgetStatus.isOverBudget) {
      suggestions.push({
        type: 'upgrade_opportunity',
        title: 'Upgrade Opportunities',
        description: `You have $${Math.round(budgetStatus.remaining)} remaining for premium campsites or activities`,
        priority: 'low',
        icon: 'trending-up',
        color: 'text-purple-600',
      });
    }

    return suggestions.slice(0, 3); // Limit to top 3 suggestions
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  static formatCurrencyDetailed(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  static getStatusColor(status: BudgetStatus['status']): string {
    switch (status) {
      case 'under_budget':
        return 'text-green-600';
      case 'near_limit':
        return 'text-yellow-600';
      case 'over_budget':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  static getStatusIcon(status: BudgetStatus['status']): string {
    switch (status) {
      case 'under_budget':
        return 'check-circle';
      case 'near_limit':
        return 'alert-triangle';
      case 'over_budget':
        return 'x-circle';
      default:
        return 'circle';
    }
  }
}