import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import QuickActions from '../QuickActions';
import { BrowserRouter } from 'react-router-dom';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('QuickActions', () => {
  const mockHandlers = {
    onAddExpense: vi.fn(),
    onAddIncome: vi.fn(),
    onOpenReceipt: vi.fn(),
    onVoiceEntry: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all quick action buttons', () => {
    renderWithRouter(
      <QuickActions {...mockHandlers} isVoiceAvailable={true} />
    );

    expect(screen.getByText('Quick Expense')).toBeInTheDocument();
    expect(screen.getByText('Log Fuel')).toBeInTheDocument();
    expect(screen.getByText('Scan Receipt')).toBeInTheDocument();
    expect(screen.getByText('Voice Entry')).toBeInTheDocument();
    expect(screen.getByText('Add Income')).toBeInTheDocument();
  });

  it('calls appropriate handler when Quick Expense is clicked', async () => {
    renderWithRouter(
      <QuickActions {...mockHandlers} isVoiceAvailable={true} />
    );

    const quickExpenseButton = screen.getByText('Quick Expense');
    fireEvent.click(quickExpenseButton);

    await waitFor(() => {
      expect(mockHandlers.onAddExpense).toHaveBeenCalledWith();
    });
  });

  it('calls handler with fuel preset when Log Fuel is clicked', async () => {
    renderWithRouter(
      <QuickActions {...mockHandlers} isVoiceAvailable={true} />
    );

    const logFuelButton = screen.getByText('Log Fuel');
    fireEvent.click(logFuelButton);

    await waitFor(() => {
      expect(mockHandlers.onAddExpense).toHaveBeenCalledWith({ category: 'Fuel' });
    });
  });

  it('disables Voice Entry when voice is not available', () => {
    renderWithRouter(
      <QuickActions {...mockHandlers} isVoiceAvailable={false} />
    );

    const voiceButton = screen.getByText('Voice Entry').closest('button');
    expect(voiceButton).toBeDisabled();
  });

  it('shows offline alert when offline', () => {
    renderWithRouter(
      <QuickActions {...mockHandlers} isVoiceAvailable={true} isOffline={true} />
    );

    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
  });

  it('shows loading state when processing an action', async () => {
    renderWithRouter(
      <QuickActions {...mockHandlers} isVoiceAvailable={true} />
    );

    const quickExpenseButton = screen.getByText('Quick Expense');
    fireEvent.click(quickExpenseButton);

    // Should show loading spinner briefly
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      const loadingButton = buttons.find(btn => btn.querySelector('.animate-spin'));
      expect(loadingButton).toBeTruthy();
    });
  });

  it('calls income handler when Add Income is clicked', async () => {
    renderWithRouter(
      <QuickActions {...mockHandlers} isVoiceAvailable={true} />
    );

    const addIncomeButton = screen.getByText('Add Income');
    fireEvent.click(addIncomeButton);

    await waitFor(() => {
      expect(mockHandlers.onAddIncome).toHaveBeenCalled();
    });
  });
});