import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useBudgetSummary } from '../useBudgetSummary';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/context/AuthContext');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          gte: vi.fn(() => ({
            lte: vi.fn()
          }))
        }))
      })),
      insert: vi.fn()
    }))
  }
}));

describe('useBudgetSummary', () => {
  const mockUser = { id: 'test-user-123' };
  
  const mockBudgetSettings = {
    budget_settings: {
      weeklyBudget: 500,
      monthlyBudget: 2000,
      yearlyBudget: 24000
    }
  };

  const mockExpenses = [
    { amount: 50, category: 'fuel', expense_date: '2024-01-15' },
    { amount: 30, category: 'food', expense_date: '2024-01-16' },
    { amount: 80, category: 'accommodation', expense_date: '2024-01-17' },
    { amount: 20, category: 'entertainment', expense_date: '2024-01-18' },
    { amount: 15, category: 'other', expense_date: '2024-01-19' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
  });

  it('should return null when no user is authenticated', () => {
    (useAuth as any).mockReturnValue({ user: null });

    const { result } = renderHook(() => useBudgetSummary());

    expect(result.current.budgetSummary).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.isOverBudget).toBe(false);
  });

  it('should fetch and calculate budget summary', async () => {
    // Mock budget settings query
    const budgetSettingsQuery = {
      data: mockBudgetSettings,
      error: null
    };

    // Mock expenses query
    const expensesQuery = {
      data: mockExpenses,
      error: null
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'user_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(budgetSettingsQuery))
            }))
          }))
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => Promise.resolve(expensesQuery))
              }))
            }))
          }))
        };
      }
    });

    const { result } = renderHook(() => useBudgetSummary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.budgetSummary).toBeTruthy();
    expect(result.current.budgetSummary?.weeklyBudget).toBe(500);
    expect(result.current.budgetSummary?.totalSpent).toBe(195); // Sum of expenses
    expect(result.current.budgetSummary?.remaining).toBe(305); // 500 - 195
    expect(result.current.budgetSummary?.percentageUsed).toBe(39); // (195/500)*100
  });

  it('should calculate category breakdown correctly', async () => {
    const expensesQuery = {
      data: mockExpenses,
      error: null
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'user_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockBudgetSettings, error: null }))
            }))
          }))
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => Promise.resolve(expensesQuery))
              }))
            }))
          }))
        };
      }
    });

    const { result } = renderHook(() => useBudgetSummary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const breakdown = result.current.budgetSummary?.categoryBreakdown;
    expect(breakdown?.fuel).toBe(50);
    expect(breakdown?.food).toBe(30);
    expect(breakdown?.accommodation).toBe(80);
    expect(breakdown?.entertainment).toBe(20);
    expect(breakdown?.other).toBe(15);
  });

  it('should use default budget when no settings exist', async () => {
    // Mock no budget settings
    const budgetSettingsQuery = {
      data: null,
      error: { code: 'PGRST116' } // No rows found
    };

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'user_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve(budgetSettingsQuery))
            }))
          }))
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => Promise.resolve({ data: [], error: null }))
              }))
            }))
          }))
        };
      }
    });

    const { result } = renderHook(() => useBudgetSummary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.budgetSummary?.weeklyBudget).toBe(300); // Default
  });

  it('should detect over budget status', async () => {
    const highExpenses = [
      { amount: 400, category: 'fuel', expense_date: '2024-01-15' },
      { amount: 200, category: 'food', expense_date: '2024-01-16' }
    ];

    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'user_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockBudgetSettings, error: null }))
            }))
          }))
        };
      }
      if (table === 'expenses') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => Promise.resolve({ data: highExpenses, error: null }))
              }))
            }))
          }))
        };
      }
    });

    const { result } = renderHook(() => useBudgetSummary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.budgetSummary?.totalSpent).toBe(600);
    expect(result.current.budgetSummary?.remaining).toBe(-100);
    expect(result.current.isOverBudget).toBe(true);
    expect(result.current.budgetUtilization).toBe(120);
  });

  it('should add expense and refresh summary', async () => {
    const insertMock = vi.fn(() => Promise.resolve({ error: null }));
    
    (supabase.from as any).mockImplementation((table: string) => {
      if (table === 'expenses' && insertMock) {
        return {
          insert: insertMock,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => Promise.resolve({ data: mockExpenses, error: null }))
              }))
            }))
          }))
        };
      }
      if (table === 'user_settings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: mockBudgetSettings, error: null }))
            }))
          }))
        };
      }
    });

    const { result } = renderHook(() => useBudgetSummary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Add an expense
    await result.current.addExpense(25, 'food', 'Lunch');

    expect(insertMock).toHaveBeenCalledWith({
      user_id: 'test-user-123',
      amount: 25,
      category: 'food',
      description: 'Lunch',
      expense_date: expect.any(String)
    });
  });

  it('should handle errors gracefully', async () => {
    const error = new Error('Database error');
    
    (supabase.from as any).mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error })),
          gte: vi.fn(() => ({
            lte: vi.fn(() => Promise.resolve({ data: null, error }))
          }))
        }))
      }))
    }));

    const { result } = renderHook(() => useBudgetSummary());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.budgetSummary).toBeNull();
  });
});