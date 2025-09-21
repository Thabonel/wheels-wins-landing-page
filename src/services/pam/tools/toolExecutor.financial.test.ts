import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  executeToolCall,
  formatToolResponse
} from './toolExecutor';

const mockLogger = vi.hoisted(() => ({
  debug: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warn: vi.fn()
}));

vi.mock('@/lib/logger', () => ({
  logger: mockLogger
}));

const supabaseHarness = vi.hoisted(() => {
  type TableData = Record<string, any[]>;

  const data: TableData = {
    expenses: [
      {
        id: 1,
        user_id: 'financial-user-1',
        amount: 42.75,
        category: 'fuel',
        date: '2024-02-01',
        description: 'Gas station',
        created_at: '2024-02-01T10:00:00Z'
      },
      {
        id: 2,
        user_id: 'financial-user-1',
        amount: 68.2,
        category: 'food_dining',
        date: '2024-02-03',
        description: 'Groceries',
        created_at: '2024-02-03T15:00:00Z'
      },
      {
        id: 3,
        user_id: 'financial-user-1',
        amount: 120.5,
        category: 'travel',
        date: '2024-01-28',
        description: 'Campground reservation',
        created_at: '2024-01-15T12:00:00Z'
      }
    ],
    budgets: [
      {
        id: 'budget-1',
        user_id: 'financial-user-1',
        category: 'fuel',
        name: 'Fuel February',
        start_date: '2024-02-01',
        end_date: '2024-02-29',
        budgeted_amount: 250,
        created_at: '2024-01-20T12:00:00Z'
      },
      {
        id: 'budget-2',
        user_id: 'financial-user-1',
        category: 'food_dining',
        name: 'Food Q1',
        start_date: '2024-01-01',
        end_date: '2024-03-31',
        budgeted_amount: 600,
        created_at: '2023-12-20T09:00:00Z'
      }
    ],
    income_entries: [
      {
        id: 'income-1',
        user_id: 'financial-user-1',
        amount: 2500,
        source: 'Salary',
        date: '2024-01-31',
        type: 'salary',
        description: 'Monthly payroll',
        created_at: '2024-01-31T08:00:00Z'
      },
      {
        id: 'income-2',
        user_id: 'financial-user-1',
        amount: 650,
        source: 'Freelance',
        date: '2024-01-22',
        type: 'freelance',
        description: 'Design project',
        created_at: '2024-01-22T11:00:00Z'
      }
    ]
  };

  type FilterCondition = {
    type: 'eq' | 'gte' | 'lte';
    column: string;
    value: any;
  };

  const getTableRows = (table: string) => {
    const tableData = data[table];
    if (!tableData) {
      return [];
    }

    return tableData.map(row => JSON.parse(JSON.stringify(row)));
  };

  const getValue = (record: any, column: string) => {
    return column.split('.').reduce((acc, key) => (acc != null ? acc[key] : undefined), record);
  };

  const compare = (value: any, target: any, operator: 'gte' | 'lte') => {
    if (value === undefined || value === null || target === undefined || target === null) {
      return false;
    }

    const valueDate = Date.parse(value);
    const targetDate = Date.parse(target);
    if (!Number.isNaN(valueDate) && !Number.isNaN(targetDate)) {
      return operator === 'gte' ? valueDate >= targetDate : valueDate <= targetDate;
    }

    const valueNumber = Number(value);
    const targetNumber = Number(target);
    if (!Number.isNaN(valueNumber) && !Number.isNaN(targetNumber)) {
      return operator === 'gte' ? valueNumber >= targetNumber : valueNumber <= targetNumber;
    }

    const valueString = String(value);
    const targetString = String(target);
    return operator === 'gte' ? valueString >= targetString : valueString <= targetString;
  };

  const applyFilters = (rows: any[], filters: FilterCondition[]) => {
    return rows.filter(row =>
      filters.every(filter => {
        const value = getValue(row, filter.column);
        if (filter.type === 'eq') {
          return value === filter.value;
        }
        return compare(value, filter.value, filter.type);
      })
    );
  };

  const sortRows = (rows: any[], order?: { column: string; ascending: boolean }) => {
    if (!order) return rows;
    const { column, ascending } = order;
    return [...rows].sort((a, b) => {
      const valueA = getValue(a, column);
      const valueB = getValue(b, column);

      if (valueA === undefined || valueA === null) return 1;
      if (valueB === undefined || valueB === null) return -1;

      const valueADate = Date.parse(valueA);
      const valueBDate = Date.parse(valueB);
      if (!Number.isNaN(valueADate) && !Number.isNaN(valueBDate)) {
        return ascending ? valueADate - valueBDate : valueBDate - valueADate;
      }

      const valueANumber = Number(valueA);
      const valueBNumber = Number(valueB);
      if (!Number.isNaN(valueANumber) && !Number.isNaN(valueBNumber)) {
        return ascending ? valueANumber - valueBNumber : valueBNumber - valueANumber;
      }

      const valueAString = String(valueA);
      const valueBString = String(valueB);
      return ascending ? valueAString.localeCompare(valueBString) : valueBString.localeCompare(valueAString);
    });
  };

  const runQuery = (table: string, state: { filters: FilterCondition[]; order?: { column: string; ascending: boolean }; limit?: number }) => {
    let rows = getTableRows(table);
    rows = applyFilters(rows, state.filters);
    rows = sortRows(rows, state.order);
    if (typeof state.limit === 'number') {
      rows = rows.slice(0, state.limit);
    }
    return rows;
  };

  function createMockSupabase() {
    return {
      from: vi.fn((table: string) => {
        const state = {
          filters: [] as FilterCondition[],
          order: undefined as { column: string; ascending: boolean } | undefined,
          limit: undefined as number | undefined
        };

        const builder: any = {
          select: () => builder,
          eq: (column: string, value: any) => {
            state.filters.push({ type: 'eq', column, value });
            return builder;
          },
          gte: (column: string, value: any) => {
            state.filters.push({ type: 'gte', column, value });
            return builder;
          },
          lte: (column: string, value: any) => {
            state.filters.push({ type: 'lte', column, value });
            return builder;
          },
          order: (column: string, options: { ascending?: boolean } = {}) => {
            state.order = { column, ascending: options.ascending !== false };
            return builder;
          },
          limit: (count: number) => {
            state.limit = count;
            return builder;
          },
          single: async () => {
            const rows = runQuery(table, state);
            if (rows.length === 0) {
              return { data: null, error: { code: 'PGRST116' } };
            }
            return { data: rows[0], error: null };
          },
          then: (onFulfilled: any, onRejected: any) => {
            const result = { data: runQuery(table, state), error: null };
            return Promise.resolve(result).then(onFulfilled, onRejected);
          }
        };

        return builder;
      })
    };
  }

  return {
    data,
    createMockSupabase
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: supabaseHarness.createMockSupabase()
}));

const TEST_USER_ID = 'financial-user-1';

describe('Tool Executor Financial Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns structured expense data and formatted summary', async () => {
    const result = await executeToolCall(
      'getUserExpenses',
      {
        limit: 5
      },
      TEST_USER_ID
    );

    expect(result.success).toBe(true);
    expect(result.data?.summary?.total_amount).toBeCloseTo(231.45, 2);

    const formatted = formatToolResponse('getUserExpenses', result.data);
    expect(formatted).toContain('Expense Overview');
    expect(formatted).toContain('Total Spent: $231.45');
    expect(formatted).toContain('Top Categories');
  });

  it('returns budgets with utilization insights', async () => {
    const result = await executeToolCall(
      'getUserBudgets',
      {
        include_summary: true,
        include_history: true
      },
      TEST_USER_ID
    );

    expect(result.success).toBe(true);
    expect(result.data?.budgets?.length).toBeGreaterThan(0);
    expect(result.data?.summary?.total_budgeted).toBe(850);

    const formatted = formatToolResponse('getUserBudgets', result.data);
    expect(formatted).toContain('Budget Overview');
    expect(formatted).toContain('Budget Details');
  });

  it('returns income data with projections', async () => {
    const result = await executeToolCall(
      'getIncomeData',
      {
        include_projections: true
      },
      TEST_USER_ID
    );

    expect(result.success).toBe(true);
    expect(result.data?.summary?.total_amount).toBe(3150);
    expect(result.data?.projections?.projected_next_30_days).toBeGreaterThan(0);

    const formatted = formatToolResponse('getIncomeData', result.data);
    expect(formatted).toContain('Income Overview');
    expect(formatted).toContain('Projections');
  });
});
