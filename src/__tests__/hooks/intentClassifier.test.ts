import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentClassifier } from '@/utils/intentClassifier';

describe('IntentClassifier', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('classifies budget-related messages locally', () => {
    const result = IntentClassifier.classifyIntent('How much have I spent on fuel?');
    expect(result.type).toBe('budget');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('classifies trip-related messages locally', () => {
    const result = IntentClassifier.classifyIntent('Plan a trip to Yellowstone');
    expect(result.type).toBe('trip');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('classifies medical-related messages locally', () => {
    const result = IntentClassifier.classifyIntent('What medications am I taking?');
    expect(result.type).toBe('medical');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('classifies social-related messages locally', () => {
    const result = IntentClassifier.classifyIntent('Find nearby RVers');
    expect(result.type).toBe('social');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('returns general for ambiguous messages', () => {
    const result = IntentClassifier.classifyIntent('hello');
    expect(result.type).toBe('general');
  });

  it('returns relevant tool categories for the classified intent', () => {
    const result = IntentClassifier.classifyIntent('Add a $50 fuel expense');
    expect(result.type).toBe('budget');
    expect(result.suggestedTools).toContain('create_expense');
  });
});
