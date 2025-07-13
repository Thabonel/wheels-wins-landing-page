import { describe, it, expect } from 'vitest';

describe('Financial Calculations', () => {
  describe('Budget Calculations', () => {
    it('should calculate budget progress correctly', () => {
      const calculateBudgetProgress = (spent: number, budget: number) => {
        if (budget === 0) return 0;
        return Math.min((spent / budget) * 100, 100);
      };

      expect(calculateBudgetProgress(250, 500)).toBe(50);
      expect(calculateBudgetProgress(600, 500)).toBe(100);
      expect(calculateBudgetProgress(0, 500)).toBe(0);
      expect(calculateBudgetProgress(100, 0)).toBe(0);
    });

    it('should determine budget status', () => {
      const getBudgetStatus = (spent: number, budget: number) => {
        const progress = (spent / budget) * 100;
        if (progress >= 100) return 'over-budget';
        if (progress >= 80) return 'warning';
        return 'on-track';
      };

      expect(getBudgetStatus(400, 500)).toBe('warning');
      expect(getBudgetStatus(600, 500)).toBe('over-budget');
      expect(getBudgetStatus(200, 500)).toBe('on-track');
    });

    it('should calculate remaining budget', () => {
      const getRemainingBudget = (spent: number, budget: number) => {
        return Math.max(budget - spent, 0);
      };

      expect(getRemainingBudget(300, 500)).toBe(200);
      expect(getRemainingBudget(600, 500)).toBe(0);
      expect(getRemainingBudget(0, 500)).toBe(500);
    });
  });

  describe('Expense Analysis', () => {
    it('should calculate category totals', () => {
      const calculateCategoryTotals = (expenses: Array<{category: string, amount: number}>) => {
        return expenses.reduce((totals, expense) => {
          totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
          return totals;
        }, {} as Record<string, number>);
      };

      const expenses = [
        { category: 'Food', amount: 25 },
        { category: 'Transport', amount: 50 },
        { category: 'Food', amount: 15 }
      ];

      const totals = calculateCategoryTotals(expenses);
      expect(totals.Food).toBe(40);
      expect(totals.Transport).toBe(50);
    });

    it('should calculate monthly averages', () => {
      const calculateMonthlyAverage = (expenses: Array<{amount: number, date: string}>) => {
        const monthlyTotals = expenses.reduce((totals, expense) => {
          const month = expense.date.substring(0, 7); // YYYY-MM
          totals[month] = (totals[month] || 0) + expense.amount;
          return totals;
        }, {} as Record<string, number>);

        const values = Object.values(monthlyTotals);
        return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      };

      const expenses = [
        { amount: 100, date: '2024-01-15' },
        { amount: 150, date: '2024-01-20' },
        { amount: 200, date: '2024-02-10' }
      ];

      expect(calculateMonthlyAverage(expenses)).toBe(225); // (250 + 200) / 2
    });
  });

  describe('Trip Cost Calculations', () => {
    it('should calculate fuel costs', () => {
      const calculateFuelCost = (distance: number, fuelEfficiency: number, fuelPrice: number) => {
        const gallonsNeeded = distance / fuelEfficiency;
        return gallonsNeeded * fuelPrice;
      };

      expect(calculateFuelCost(300, 25, 3.50)).toBeCloseTo(42, 2); // 300/25 * 3.50 = 42
      expect(calculateFuelCost(0, 25, 3.50)).toBe(0);
    });

    it('should calculate accommodation costs', () => {
      const calculateAccommodationCost = (nights: number, pricePerNight: number) => {
        return nights * pricePerNight;
      };

      expect(calculateAccommodationCost(3, 120)).toBe(360);
      expect(calculateAccommodationCost(0, 120)).toBe(0);
    });

    it('should calculate total trip budget', () => {
      const calculateTripBudget = (fuel: number, accommodation: number, food: number, activities: number) => {
        return fuel + accommodation + food + activities;
      };

      expect(calculateTripBudget(100, 240, 150, 200)).toBe(690);
      expect(calculateTripBudget(0, 0, 0, 0)).toBe(0);
    });
  });

  describe('Investment Calculations', () => {
    it('should calculate compound interest', () => {
      const calculateCompoundInterest = (principal: number, rate: number, time: number, frequency: number = 12) => {
        return principal * Math.pow(1 + rate / frequency, frequency * time);
      };

      const result = calculateCompoundInterest(1000, 0.05, 1, 12);
      expect(result).toBeCloseTo(1051.16, 2);
    });

    it('should calculate savings goal timeline', () => {
      const calculateSavingsTimeline = (currentSavings: number, monthlyContribution: number, goal: number) => {
        if (monthlyContribution <= 0) return Infinity;
        if (currentSavings >= goal) return 0;
        
        return Math.ceil((goal - currentSavings) / monthlyContribution);
      };

      expect(calculateSavingsTimeline(1000, 500, 5000)).toBe(8); // (5000-1000)/500 = 8 months
      expect(calculateSavingsTimeline(5000, 500, 3000)).toBe(0); // Already at goal
      expect(calculateSavingsTimeline(1000, 0, 5000)).toBe(Infinity);
    });
  });

  describe('Tax Calculations', () => {
    it('should calculate sales tax', () => {
      const calculateSalesTax = (amount: number, taxRate: number) => {
        return amount * (taxRate / 100);
      };

      expect(calculateSalesTax(100, 8.5)).toBe(8.5);
      expect(calculateSalesTax(0, 8.5)).toBe(0);
      expect(calculateSalesTax(100, 0)).toBe(0);
    });

    it('should calculate total with tax', () => {
      const calculateTotalWithTax = (amount: number, taxRate: number) => {
        return amount + (amount * (taxRate / 100));
      };

      expect(calculateTotalWithTax(100, 8.5)).toBe(108.5);
      expect(calculateTotalWithTax(0, 8.5)).toBe(0);
    });
  });

  describe('Currency Conversion', () => {
    it('should convert between currencies', () => {
      const convertCurrency = (amount: number, exchangeRate: number) => {
        return amount * exchangeRate;
      };

      expect(convertCurrency(100, 1.2)).toBe(120); // USD to EUR example
      expect(convertCurrency(0, 1.2)).toBe(0);
      expect(convertCurrency(100, 1)).toBe(100);
    });

    it('should handle rounding for currency', () => {
      const roundToCurrency = (amount: number) => {
        return Math.round(amount * 100) / 100;
      };

      expect(roundToCurrency(123.456)).toBe(123.46);
      expect(roundToCurrency(123.454)).toBe(123.45);
      expect(roundToCurrency(123)).toBe(123);
    });
  });
});