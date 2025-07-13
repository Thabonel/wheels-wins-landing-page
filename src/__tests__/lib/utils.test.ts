import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('Utils', () => {
  describe('cn (className utility)', () => {
    it('combines class names correctly', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('handles conditional classes', () => {
      const isActive = true;
      const isHidden = false;
      const result = cn('base', isActive && 'conditional', isHidden && 'hidden');
      expect(result).toBe('base conditional');
    });

    it('handles undefined and null values', () => {
      const result = cn('base', undefined, null, 'end');
      expect(result).toBe('base end');
    });

    it('merges Tailwind classes correctly', () => {
      const result = cn('p-4', 'p-2');
      expect(result).toContain('p-2'); // Later class should override
    });

    it('handles empty input', () => {
      const result = cn();
      expect(result).toBe('');
    });

    it('handles arrays of classes', () => {
      const result = cn(['class1', 'class2'], 'class3');
      expect(result).toBe('class1 class2 class3');
    });

    it('deduplicates identical classes', () => {
      const result = cn('duplicate', 'other', 'duplicate');
      expect(result).toBe('other duplicate');
    });
  });
});