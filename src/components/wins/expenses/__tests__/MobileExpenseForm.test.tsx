import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MobileExpenseForm from '../MobileExpenseForm';
import { BrowserRouter } from 'react-router-dom';

// Mock hooks
vi.mock('@/hooks/useExpenseActions', () => ({
  useExpenseActions: () => ({
    addExpense: vi.fn().mockReturnValue(true),
    categories: ['Fuel', 'Food', 'Lodging', 'Entertainment', 'Other']
  })
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user' }
  })
}));

vi.mock('@/services/receiptService', () => ({
  receiptService: {
    uploadReceipt: vi.fn().mockResolvedValue({ receipt_url: 'test-url' }),
    uploadReceiptDirect: vi.fn().mockResolvedValue('test-url')
  }
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('MobileExpenseForm', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the first step (amount) correctly', () => {
    renderWithRouter(
      <MobileExpenseForm onClose={mockOnClose} />
    );

    expect(screen.getByText('How much did you spend?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
  });

  it('shows validation error for empty amount', async () => {
    renderWithRouter(
      <MobileExpenseForm onClose={mockOnClose} />
    );

    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid amount')).toBeInTheDocument();
    });
  });

  it('progresses through all steps', async () => {
    renderWithRouter(
      <MobileExpenseForm onClose={mockOnClose} />
    );

    // Step 1: Amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '50.00' } });
    fireEvent.click(screen.getByText('Next'));

    // Step 2: Category
    await waitFor(() => {
      expect(screen.getByText('What type of expense?')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Fuel'));
    fireEvent.click(screen.getByText('Next'));

    // Step 3: Description
    await waitFor(() => {
      expect(screen.getByText('What was it for?')).toBeInTheDocument();
    });
    const descriptionInput = screen.getByPlaceholderText('e.g., Grocery shopping at Walmart');
    fireEvent.change(descriptionInput, { target: { value: 'Gas at Shell station' } });
    fireEvent.click(screen.getByText('Next'));

    // Step 4: Date
    await waitFor(() => {
      expect(screen.getByText('When did you spend it?')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Next'));

    // Step 5: Receipt
    await waitFor(() => {
      expect(screen.getByText('Do you have a receipt?')).toBeInTheDocument();
    });
    expect(screen.getByText('Save Expense')).toBeInTheDocument();
  });

  it('shows back button after first step', async () => {
    renderWithRouter(
      <MobileExpenseForm onClose={mockOnClose} />
    );

    // Progress to second step
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '50.00' } });
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Back')).toBeInTheDocument();
    });
  });

  it('closes form when X is clicked', () => {
    renderWithRouter(
      <MobileExpenseForm onClose={mockOnClose} />
    );

    // Find the close button - it's the first button in the header
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons[0]; // The X button is the first button
    
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows progress bar that updates with steps', async () => {
    renderWithRouter(
      <MobileExpenseForm onClose={mockOnClose} />
    );

    // Check initial progress (20% for step 1 of 5)
    const progressBar = document.querySelector('[style*="width"]');
    expect(progressBar).toHaveStyle({ width: '20%' });

    // Progress to step 2
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '50.00' } });
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      const updatedProgressBar = document.querySelector('[style*="width"]');
      expect(updatedProgressBar).toHaveStyle({ width: '40%' });
    });
  });

  it('allows skipping receipt on last step', async () => {
    renderWithRouter(
      <MobileExpenseForm onClose={mockOnClose} />
    );

    // Progress through all steps to receipt
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '50.00' } });
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => screen.getByText('What type of expense?'));
    fireEvent.click(screen.getByText('Fuel'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => screen.getByText('What was it for?'));
    const descriptionInput = screen.getByPlaceholderText('e.g., Grocery shopping at Walmart');
    fireEvent.change(descriptionInput, { target: { value: 'Gas at Shell station' } });
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => screen.getByText('When did you spend it?'));
    fireEvent.click(screen.getByText('Next'));

    await waitFor(() => {
      expect(screen.getByText('Skip Receipt')).toBeInTheDocument();
    });
  });
});