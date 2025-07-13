import { describe, it, expect } from 'vitest';

describe('Trip Calculations', () => {
  describe('Distance and Route Calculations', () => {
    it('should calculate distance between coordinates', () => {
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 3959; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      // Distance from NYC to LA (approximately)
      const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeCloseTo(2445, -1); // ~2445 miles
    });

    it('should calculate estimated travel time', () => {
      const calculateTravelTime = (distance: number, averageSpeed: number) => {
        return distance / averageSpeed;
      };

      expect(calculateTravelTime(300, 60)).toBe(5); // 5 hours
      expect(calculateTravelTime(0, 60)).toBe(0);
      expect(calculateTravelTime(120, 40)).toBe(3);
    });

    it('should add buffer time for stops', () => {
      const addStopBuffer = (baseTime: number, numStops: number, stopDuration: number = 0.25) => {
        return baseTime + (numStops * stopDuration);
      };

      expect(addStopBuffer(5, 2)).toBe(5.5); // 5 hours + 2 stops (15 min each)
      expect(addStopBuffer(3, 0)).toBe(3);
      expect(addStopBuffer(8, 4, 0.5)).toBe(10); // 8 hours + 4 stops (30 min each)
    });
  });

  describe('Fuel Calculations', () => {
    it('should calculate fuel consumption', () => {
      const calculateFuelNeeded = (distance: number, mpg: number) => {
        return distance / mpg;
      };

      expect(calculateFuelNeeded(300, 25)).toBe(12); // 12 gallons
      expect(calculateFuelNeeded(0, 25)).toBe(0);
      expect(calculateFuelNeeded(400, 20)).toBe(20);
    });

    it('should calculate fuel cost with current prices', () => {
      const calculateFuelCost = (gallons: number, pricePerGallon: number) => {
        return gallons * pricePerGallon;
      };

      expect(calculateFuelCost(12, 3.50)).toBe(42);
      expect(calculateFuelCost(0, 3.50)).toBe(0);
      expect(calculateFuelCost(15, 4.00)).toBe(60);
    });

    it('should estimate fuel costs for different vehicle types', () => {
      const estimateFuelCostByVehicle = (distance: number, vehicleType: string, fuelPrice: number) => {
        const mpgRatings = {
          'compact': 32,
          'sedan': 28,
          'suv': 22,
          'truck': 18,
          'hybrid': 45
        };
        
        const mpg = mpgRatings[vehicleType as keyof typeof mpgRatings] || 25;
        const gallons = distance / mpg;
        return gallons * fuelPrice;
      };

      expect(estimateFuelCostByVehicle(320, 'compact', 3.50)).toBeCloseTo(35, 2);
      expect(estimateFuelCostByVehicle(320, 'suv', 3.50)).toBeCloseTo(50.91, 2);
      expect(estimateFuelCostByVehicle(320, 'hybrid', 3.50)).toBeCloseTo(24.89, 2);
    });
  });

  describe('Accommodation Calculations', () => {
    it('should calculate accommodation costs', () => {
      const calculateAccommodationCost = (nights: number, pricePerNight: number, rooms: number = 1) => {
        return nights * pricePerNight * rooms;
      };

      expect(calculateAccommodationCost(3, 120)).toBe(360);
      expect(calculateAccommodationCost(2, 150, 2)).toBe(600);
      expect(calculateAccommodationCost(0, 120)).toBe(0);
    });

    it('should apply seasonal pricing adjustments', () => {
      const applySeasonalPricing = (basePrice: number, season: string) => {
        const multipliers = {
          'peak': 1.5,
          'high': 1.2,
          'low': 0.8,
          'off': 0.6
        };
        
        return basePrice * (multipliers[season as keyof typeof multipliers] || 1);
      };

      expect(applySeasonalPricing(100, 'peak')).toBe(150);
      expect(applySeasonalPricing(100, 'low')).toBe(80);
      expect(applySeasonalPricing(100, 'off')).toBe(60);
    });
  });

  describe('Food and Dining Calculations', () => {
    it('should estimate daily food costs', () => {
      const estimateDailyFoodCost = (mealPlan: string, people: number = 1) => {
        const dailyCosts = {
          'budget': 25,
          'moderate': 50,
          'luxury': 100
        };
        
        return (dailyCosts[mealPlan as keyof typeof dailyCosts] || 50) * people;
      };

      expect(estimateDailyFoodCost('budget', 2)).toBe(50);
      expect(estimateDailyFoodCost('luxury', 1)).toBe(100);
      expect(estimateDailyFoodCost('moderate', 4)).toBe(200);
    });

    it('should calculate total food cost for trip', () => {
      const calculateTripFoodCost = (days: number, dailyCost: number) => {
        return days * dailyCost;
      };

      expect(calculateTripFoodCost(5, 75)).toBe(375);
      expect(calculateTripFoodCost(0, 75)).toBe(0);
      expect(calculateTripFoodCost(7, 60)).toBe(420);
    });
  });

  describe('Activity and Entertainment Costs', () => {
    it('should calculate activity costs', () => {
      const calculateActivityCosts = (activities: Array<{name: string, cost: number, people: number}>) => {
        return activities.reduce((total, activity) => {
          return total + (activity.cost * activity.people);
        }, 0);
      };

      const activities = [
        { name: 'Museum', cost: 15, people: 2 },
        { name: 'Concert', cost: 75, people: 2 },
        { name: 'Tour', cost: 50, people: 1 }
      ];

      expect(calculateActivityCosts(activities)).toBe(230); // (15*2) + (75*2) + (50*1)
    });

    it('should apply group discounts', () => {
      const applyGroupDiscount = (totalCost: number, groupSize: number) => {
        if (groupSize >= 10) return totalCost * 0.8; // 20% discount
        if (groupSize >= 6) return totalCost * 0.9;  // 10% discount
        return totalCost;
      };

      expect(applyGroupDiscount(1000, 12)).toBe(800);
      expect(applyGroupDiscount(1000, 8)).toBe(900);
      expect(applyGroupDiscount(1000, 4)).toBe(1000);
    });
  });

  describe('Emergency and Miscellaneous Costs', () => {
    it('should calculate emergency fund recommendation', () => {
      const calculateEmergencyFund = (totalTripCost: number, percentage: number = 10) => {
        return totalTripCost * (percentage / 100);
      };

      expect(calculateEmergencyFund(2000)).toBe(200);
      expect(calculateEmergencyFund(1500, 15)).toBe(225);
      expect(calculateEmergencyFund(0)).toBe(0);
    });

    it('should calculate tolls and fees', () => {
      const calculateTollsAndFees = (route: Array<{name: string, cost: number}>) => {
        return route.reduce((total, segment) => total + segment.cost, 0);
      };

      const route = [
        { name: 'Golden Gate Bridge', cost: 8 },
        { name: 'Bay Bridge', cost: 6 },
        { name: 'Parking Fee', cost: 20 }
      ];

      expect(calculateTollsAndFees(route)).toBe(34);
    });
  });

  describe('Total Trip Cost Summary', () => {
    it('should calculate comprehensive trip cost', () => {
      const calculateTotalTripCost = (costs: {
        fuel: number,
        accommodation: number,
        food: number,
        activities: number,
        misc: number
      }) => {
        return Object.values(costs).reduce((total, cost) => total + cost, 0);
      };

      const costs = {
        fuel: 150,
        accommodation: 600,
        food: 400,
        activities: 300,
        misc: 100
      };

      expect(calculateTotalTripCost(costs)).toBe(1550);
    });

    it('should calculate cost per person for group trips', () => {
      const calculateCostPerPerson = (totalCost: number, groupSize: number, sharedCosts: number = 0) => {
        const individualCost = (totalCost - sharedCosts) / groupSize;
        const sharedCostPerPerson = sharedCosts / groupSize;
        return individualCost + sharedCostPerPerson;
      };

      expect(calculateCostPerPerson(1200, 4, 400)).toBe(300); // (800/4) + (400/4)
      expect(calculateCostPerPerson(1000, 2, 0)).toBe(500);
    });

    it('should format cost breakdown', () => {
      const formatCostBreakdown = (costs: Record<string, number>) => {
        const total = Object.values(costs).reduce((sum, cost) => sum + cost, 0);
        const percentages = Object.entries(costs).map(([category, amount]) => ({
          category,
          amount,
          percentage: total > 0 ? Math.round((amount / total) * 100) : 0
        }));
        
        return { total, breakdown: percentages };
      };

      const costs = { fuel: 200, accommodation: 600, food: 200 };
      const result = formatCostBreakdown(costs);
      
      expect(result.total).toBe(1000);
      expect(result.breakdown.find(item => item.category === 'accommodation')?.percentage).toBe(60);
      expect(result.breakdown.find(item => item.category === 'fuel')?.percentage).toBe(20);
    });
  });
});