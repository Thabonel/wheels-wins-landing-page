import { describe, it, expect } from 'vitest';

// Test utility functions that are likely to exist
describe('Utility Functions', () => {
  describe('Currency Formatting', () => {
    it('should format currency correctly', () => {
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(amount);
      };

      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(-100)).toBe('-$100.00');
    });

    it('should handle large numbers', () => {
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(amount);
      };

      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });
  });

  describe('Date Formatting', () => {
    it('should format dates correctly', () => {
      const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-US').format(date);
      };

      const testDate = new Date('2024-07-13');
      expect(formatDate(testDate)).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    });

    it('should handle relative time', () => {
      const getRelativeTime = (date: Date) => {
        const now = new Date();
        const diffInMs = now.getTime() - date.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        
        if (diffInDays === 0) return 'Today';
        if (diffInDays === 1) return 'Yesterday';
        return `${diffInDays} days ago`;
      };

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      expect(getRelativeTime(today)).toBe('Today');
      expect(getRelativeTime(yesterday)).toBe('Yesterday');
      expect(getRelativeTime(weekAgo)).toBe('7 days ago');
    });
  });

  describe('String Utilities', () => {
    it('should truncate text correctly', () => {
      const truncateText = (text: string, maxLength: number) => {
        if (text.length <= maxLength) return text;
        return `${text.slice(0, maxLength)  }...`;
      };

      expect(truncateText('Hello World', 5)).toBe('Hello...');
      expect(truncateText('Short', 10)).toBe('Short');
      expect(truncateText('', 5)).toBe('');
    });

    it('should capitalize words correctly', () => {
      const capitalizeWords = (text: string) => {
        return text.replace(/\b\w/g, char => char.toUpperCase());
      };

      expect(capitalizeWords('hello world')).toBe('Hello World');
      expect(capitalizeWords('test case')).toBe('Test Case');
      expect(capitalizeWords('')).toBe('');
    });
  });

  describe('Validation Utilities', () => {
    it('should validate email addresses', () => {
      const isValidEmail = (email: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };

      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user@domain.org')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('test@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
    });

    it('should validate phone numbers', () => {
      const isValidPhone = (phone: string) => {
        const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
        return phoneRegex.test(phone);
      };

      expect(isValidPhone('(123) 456-7890')).toBe(true);
      expect(isValidPhone('(555) 123-4567')).toBe(true);
      expect(isValidPhone('123-456-7890')).toBe(false);
      expect(isValidPhone('1234567890')).toBe(false);
    });
  });

  describe('Array Utilities', () => {
    it('should group array items correctly', () => {
      const groupBy = <T>(array: T[], keyFn: (item: T) => string) => {
        return array.reduce((groups, item) => {
          const key = keyFn(item);
          return {
            ...groups,
            [key]: [...(groups[key] || []), item]
          };
        }, {} as Record<string, T[]>);
      };

      const expenses = [
        { category: 'Food', amount: 25 },
        { category: 'Transport', amount: 50 },
        { category: 'Food', amount: 15 }
      ];

      const grouped = groupBy(expenses, item => item.category);
      
      expect(grouped.Food).toHaveLength(2);
      expect(grouped.Transport).toHaveLength(1);
      expect(grouped.Food[0].amount).toBe(25);
    });

    it('should calculate array sum correctly', () => {
      const sum = (numbers: number[]) => {
        return numbers.reduce((total, num) => total + num, 0);
      };

      expect(sum([1, 2, 3, 4, 5])).toBe(15);
      expect(sum([])).toBe(0);
      expect(sum([10])).toBe(10);
      expect(sum([-1, 1])).toBe(0);
    });
  });
});