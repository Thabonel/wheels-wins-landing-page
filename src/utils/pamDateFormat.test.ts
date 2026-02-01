/**
 * Tests for PAM Date Formatting Utility
 */

import { describe, it, expect } from 'vitest';
import { formatDateForPam, getTodayForPam, cleanDatesForPam, isValidPamDateFormat } from './pamDateFormat';

describe('PAM Date Formatting', () => {
  describe('formatDateForPam', () => {
    it('should format Date objects correctly', () => {
      const date = new Date('2025-01-15T10:30:00Z');
      expect(formatDateForPam(date)).toBe('2025-01-15');
    });

    it('should handle already formatted dates', () => {
      expect(formatDateForPam('2025-01-15')).toBe('2025-01-15');
    });

    it('should format ISO strings correctly', () => {
      expect(formatDateForPam('2025-01-15T10:30:00Z')).toBe('2025-01-15');
      expect(formatDateForPam('2025-01-15T10:30:00.000Z')).toBe('2025-01-15');
    });

    it('should handle null and undefined inputs', () => {
      expect(formatDateForPam(null)).toBeNull();
      expect(formatDateForPam(undefined)).toBeNull();
      expect(formatDateForPam('')).toBeNull();
    });

    it('should handle invalid dates gracefully', () => {
      expect(formatDateForPam('invalid-date')).toBeNull();
      expect(formatDateForPam('2025-13-45')).toBeNull();
    });
  });

  describe('getTodayForPam', () => {
    it('should return today in YYYY-MM-DD format', () => {
      const today = getTodayForPam();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      // Verify it's actually today
      const todayDate = new Date();
      const expectedToday = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
      expect(today).toBe(expectedToday);
    });
  });

  describe('cleanDatesForPam', () => {
    it('should clean date fields in objects', () => {
      const input = {
        start_date: '2025-01-15T10:30:00Z',
        end_date: new Date('2025-01-20'),
        normal_field: 'keep this',
        number_field: 42
      };

      const result = cleanDatesForPam(input);

      expect(result).toEqual({
        start_date: '2025-01-15',
        end_date: '2025-01-20',
        normal_field: 'keep this',
        number_field: 42
      });
    });

    it('should clean nested date fields', () => {
      const input = {
        metadata: {
          created_date: '2025-01-15T10:30:00Z',
          modified_date: new Date('2025-01-20T00:00:00.000Z') // Use Date object instead
        },
        trip: {
          departure_date: new Date('2025-02-01T00:00:00.000Z')
        }
      };

      const result = cleanDatesForPam(input);

      expect(result.metadata.created_date).toBe('2025-01-15');
      expect(result.metadata.modified_date).toBe('2025-01-20');
      expect(result.trip.departure_date).toBe('2025-02-01');
    });

    it('should handle null and invalid dates', () => {
      const input = {
        start_date: null,
        end_date: 'invalid-date',
        valid_date: '2025-01-15'
      };

      const result = cleanDatesForPam(input);

      expect(result).toEqual({
        start_date: null,
        end_date: null,
        valid_date: '2025-01-15'
      });
    });

    it('should handle arrays and preserve non-date fields', () => {
      const input = {
        dates: ['2025-01-15T10:30:00Z', '2025-01-20T15:45:00Z'],
        update_date: '2025-01-15T10:30:00Z',
        name: 'Trip Name',
        count: 5
      };

      const result = cleanDatesForPam(input);

      expect(result).toEqual({
        dates: ['2025-01-15T10:30:00Z', '2025-01-20T15:45:00Z'], // Arrays preserved as-is
        update_date: '2025-01-15',
        name: 'Trip Name',
        count: 5
      });
    });
  });

  describe('isValidPamDateFormat', () => {
    it('should validate correct PAM date format', () => {
      expect(isValidPamDateFormat('2025-01-15')).toBe(true);
      expect(isValidPamDateFormat('2025-12-31')).toBe(true);
      expect(isValidPamDateFormat('2000-01-01')).toBe(true);
    });

    it('should reject invalid formats', () => {
      expect(isValidPamDateFormat('2025-1-15')).toBe(false);      // Missing zero padding
      expect(isValidPamDateFormat('2025-01-5')).toBe(false);       // Missing zero padding
      expect(isValidPamDateFormat('25-01-15')).toBe(false);        // Wrong year format
      expect(isValidPamDateFormat('2025/01/15')).toBe(false);      // Wrong separators
      expect(isValidPamDateFormat('15-01-2025')).toBe(false);      // Wrong order
      expect(isValidPamDateFormat('2025-01-15T10:30:00Z')).toBe(false); // ISO format
      expect(isValidPamDateFormat('')).toBe(false);                // Empty string
      expect(isValidPamDateFormat('invalid')).toBe(false);         // Invalid string
    });
  });
});