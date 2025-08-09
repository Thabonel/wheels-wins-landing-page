import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, Mock } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AddExpenseForm from '@/components/wins/expenses/AddExpenseForm';
import { addExpense } from '@/services/expenseService';
import { uploadReceiptToSupabase } from '@/services/receiptService';
import { useToast } from '@/hooks/use-toast';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

// Mock dependencies
vi.mock('@/services/expenseService');
vi.mock('@/services/receiptService');
vi.mock('@/hooks/use-toast');
vi.mock('@/hooks/useSpeechRecognition');

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn()
      }))
    }
  }
}));

describe('Expense Receipt Workflow Integration', () => {
  const mockToast = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();
  const mockAddExpense = addExpense as Mock;
  const mockUploadReceipt = uploadReceiptToSupabase as Mock;
  
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    
    (useToast as Mock).mockReturnValue({ toast: mockToast });
    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: false,
      transcript: '',
      startListening: vi.fn(),
      stopListening: vi.fn(),
      error: null,
      isSupported: true
    });
    
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
  });

  const renderWithQueryClient = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        {component}
      </QueryClientProvider>
    );
  };

  describe('Complete Expense Creation with Receipt', () => {
    it('successfully creates expense with receipt upload', async () => {
      const user = userEvent.setup();
      const receiptUrl = 'https://example.supabase.co/storage/receipts/test.jpg';
      
      mockUploadReceipt.mockResolvedValue(receiptUrl);
      mockAddExpense.mockResolvedValue({
        id: 1,
        amount: 45.50,
        category: 'fuel',
        description: 'Gas at Shell',
        receipt_url: receiptUrl,
        date: '2024-01-20'
      });

      renderWithQueryClient(
        <AddExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Fill in expense form
      await user.type(screen.getByLabelText(/amount/i), '45.50');
      await user.click(screen.getByLabelText(/category/i));
      await user.click(screen.getByText('Fuel'));
      await user.type(screen.getByLabelText(/description/i), 'Gas at Shell');

      // Upload receipt
      const file = new File(['receipt image'], 'receipt.jpg', { type: 'image/jpeg' });
      const uploadButton = screen.getByText('Upload Receipt');
      const fileInput = uploadButton.parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, file);

      // Verify receipt preview
      await waitFor(() => {
        expect(screen.getByText('receipt.jpg')).toBeInTheDocument();
        expect(screen.getByAltText('Receipt preview')).toBeInTheDocument();
      });

      // Submit form
      await user.click(screen.getByRole('button', { name: /add expense/i }));

      // Verify upload was called
      await waitFor(() => {
        expect(mockUploadReceipt).toHaveBeenCalledWith(file, 'expenses');
      });

      // Verify expense was created with receipt URL
      await waitFor(() => {
        expect(mockAddExpense).toHaveBeenCalledWith({
          amount: 45.50,
          category: 'fuel',
          description: 'Gas at Shell',
          date: expect.any(String),
          receipt_url: receiptUrl
        });
      });

      // Verify success callback
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: "Expense Added",
        description: "Your expense has been recorded successfully.",
      });
    });

    it('creates expense even if receipt upload fails', async () => {
      const user = userEvent.setup();
      
      mockUploadReceipt.mockRejectedValue(new Error('Upload failed'));
      mockAddExpense.mockResolvedValue({
        id: 1,
        amount: 30,
        category: 'food',
        description: 'Lunch',
        date: '2024-01-20'
      });

      renderWithQueryClient(
        <AddExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Fill form and add receipt
      await user.type(screen.getByLabelText(/amount/i), '30');
      await user.click(screen.getByLabelText(/category/i));
      await user.click(screen.getByText('Food'));

      const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByText('Upload Receipt').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      // Submit
      await user.click(screen.getByRole('button', { name: /add expense/i }));

      // Should show warning but still create expense
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Receipt Upload Failed",
          description: "The expense was saved but the receipt couldn't be uploaded.",
          variant: "destructive"
        });
      });

      expect(mockAddExpense).toHaveBeenCalledWith({
        amount: 30,
        category: 'food',
        description: 'Lunch',
        date: expect.any(String),
        receipt_url: undefined
      });
    });
  });

  describe('Voice Command Integration', () => {
    it('creates expense from voice command with receipt', async () => {
      const user = userEvent.setup();
      const receiptUrl = 'https://example.supabase.co/storage/receipts/voice.jpg';
      
      mockUploadReceipt.mockResolvedValue(receiptUrl);
      mockAddExpense.mockResolvedValue({
        id: 2,
        amount: 65,
        category: 'fuel',
        description: 'Gas for RV trip',
        receipt_url: receiptUrl
      });

      // Mock voice recognition returning a command
      (useSpeechRecognition as Mock).mockReturnValue({
        isListening: false,
        transcript: 'log 65 dollars for gas for RV trip',
        startListening: vi.fn(),
        stopListening: vi.fn(),
        error: null,
        isSupported: true
      });

      renderWithQueryClient(
        <AddExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // The form should be populated from voice command
      await waitFor(() => {
        const amountInput = screen.getByLabelText(/amount/i) as HTMLInputElement;
        expect(amountInput.value).toBe('65');
      });

      // Add a receipt
      const file = new File(['receipt'], 'gas-receipt.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByText('Upload Receipt').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      // Submit
      await user.click(screen.getByRole('button', { name: /add expense/i }));

      await waitFor(() => {
        expect(mockAddExpense).toHaveBeenCalledWith({
          amount: 65,
          category: 'fuel',
          description: 'Gas for RV trip',
          date: expect.any(String),
          receipt_url: receiptUrl
        });
      });
    });
  });

  describe('Receipt Management', () => {
    it('allows removing receipt before submission', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(
        <AddExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Upload receipt
      const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByText('Upload Receipt').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      await user.upload(fileInput, file);

      // Verify receipt is shown
      await waitFor(() => {
        expect(screen.getByText('receipt.jpg')).toBeInTheDocument();
      });

      // Remove receipt
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      // Receipt should be removed
      expect(screen.queryByText('receipt.jpg')).not.toBeInTheDocument();
      expect(screen.getByText('Upload Receipt')).toBeInTheDocument();
    });

    it('validates receipt file size', async () => {
      const user = userEvent.setup();
      window.alert = vi.fn();
      
      renderWithQueryClient(
        <AddExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Try to upload oversized file
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByText('Upload Receipt').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, largeFile);

      expect(window.alert).toHaveBeenCalledWith('File size must be less than 5MB');
      expect(screen.queryByText('large.jpg')).not.toBeInTheDocument();
    });

    it('only accepts image files', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(
        <AddExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Try to upload non-image file
      const pdfFile = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' });
      const fileInput = screen.getByText('Upload Receipt').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      await user.upload(fileInput, pdfFile);

      // File should be rejected
      expect(screen.queryByText('document.pdf')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows error when expense creation fails', async () => {
      const user = userEvent.setup();
      
      mockAddExpense.mockRejectedValue(new Error('Network error'));

      renderWithQueryClient(
        <AddExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Fill minimum required fields
      await user.type(screen.getByLabelText(/amount/i), '25');
      await user.click(screen.getByLabelText(/category/i));
      await user.click(screen.getByText('Food'));

      // Submit
      await user.click(screen.getByRole('button', { name: /add expense/i }));

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Error",
          description: "Failed to add expense. Please try again.",
          variant: "destructive"
        });
      });

      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('handles receipt preview errors gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock createObjectURL to throw
      global.URL.createObjectURL = vi.fn(() => {
        throw new Error('Failed to create URL');
      });

      renderWithQueryClient(
        <AddExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      const file = new File(['receipt'], 'receipt.jpg', { type: 'image/jpeg' });
      const fileInput = screen.getByText('Upload Receipt').parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
      
      // Upload should still work even if preview fails
      await user.upload(fileInput, file);

      // File name should still be shown
      await waitFor(() => {
        expect(screen.getByText('receipt.jpg')).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('prevents submission without required fields', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(
        <AddExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      // Try to submit empty form
      await user.click(screen.getByRole('button', { name: /add expense/i }));

      // Should not call addExpense
      expect(mockAddExpense).not.toHaveBeenCalled();
      
      // Should show validation errors
      expect(screen.getByText(/amount is required/i)).toBeInTheDocument();
    });

    it('validates amount is positive', async () => {
      const user = userEvent.setup();
      
      renderWithQueryClient(
        <AddExpenseForm onSuccess={mockOnSuccess} onCancel={mockOnCancel} />
      );

      await user.type(screen.getByLabelText(/amount/i), '-10');
      await user.click(screen.getByRole('button', { name: /add expense/i }));

      expect(screen.getByText(/amount must be positive/i)).toBeInTheDocument();
      expect(mockAddExpense).not.toHaveBeenCalled();
    });
  });
});