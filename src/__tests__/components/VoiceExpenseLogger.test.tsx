import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, Mock } from 'vitest';
import VoiceExpenseLogger from '@/components/wins/expenses/VoiceExpenseLogger';
import { useToast } from '@/hooks/use-toast';
import { addExpense } from '@/services/expenseService';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';

// Mock dependencies
vi.mock('@/hooks/use-toast');
vi.mock('@/services/expenseService');
vi.mock('@/hooks/useSpeechRecognition');

describe('VoiceExpenseLogger', () => {
  const mockToast = vi.fn();
  const mockAddExpense = addExpense as Mock;
  const mockStartListening = vi.fn();
  const mockStopListening = vi.fn();

  beforeEach(() => {
    mockToast.mockClear();
    mockAddExpense.mockClear();
    mockStartListening.mockClear();
    mockStopListening.mockClear();

    (useToast as Mock).mockReturnValue({ toast: mockToast });
    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: false,
      transcript: '',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      error: null,
      isSupported: true
    });
  });

  it('renders voice button when speech recognition is supported', () => {
    render(<VoiceExpenseLogger />);
    
    expect(screen.getByRole('button', { name: /voice expense/i })).toBeInTheDocument();
    expect(screen.getByText('Voice Expense')).toBeInTheDocument();
  });

  it('does not render when speech recognition is not supported', () => {
    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: false,
      transcript: '',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      error: null,
      isSupported: false
    });

    const { container } = render(<VoiceExpenseLogger />);
    expect(container.firstChild).toBeNull();
  });

  it('starts listening when button is clicked', async () => {
    const user = userEvent.setup();
    render(<VoiceExpenseLogger />);
    
    const button = screen.getByRole('button', { name: /voice expense/i });
    await user.click(button);

    expect(mockStartListening).toHaveBeenCalledWith({
      continuous: false,
      language: 'en-US'
    });
  });

  it('shows listening state correctly', () => {
    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: true,
      transcript: '',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      error: null,
      isSupported: true
    });

    render(<VoiceExpenseLogger />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600');
    expect(screen.getByText('Listening...')).toBeInTheDocument();
  });

  it('processes voice command when transcript changes', async () => {
    const { rerender } = render(<VoiceExpenseLogger />);

    // Simulate speech recognition returning a transcript
    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: false,
      transcript: 'log 45 dollars for gas',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      error: null,
      isSupported: true
    });

    mockAddExpense.mockResolvedValue({ id: 1, amount: 45, category: 'fuel' });

    rerender(<VoiceExpenseLogger />);

    await waitFor(() => {
      expect(mockAddExpense).toHaveBeenCalledWith({
        amount: 45,
        category: 'fuel',
        description: 'Gas',
        date: expect.any(String)
      });
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Expense Added',
        description: 'Added $45.00 expense for Gas'
      });
    });
  });

  it('handles invalid voice commands', async () => {
    const { rerender } = render(<VoiceExpenseLogger />);

    // Simulate invalid transcript
    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: false,
      transcript: 'hello world',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      error: null,
      isSupported: true
    });

    rerender(<VoiceExpenseLogger />);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Invalid Command',
        description: "I couldn't understand that expense command. Please try again.",
        variant: 'destructive'
      });
    });

    expect(mockAddExpense).not.toHaveBeenCalled();
  });

  it('handles speech recognition errors', () => {
    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: false,
      transcript: '',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      error: 'No speech detected',
      isSupported: true
    });

    render(<VoiceExpenseLogger />);

    expect(mockToast).toHaveBeenCalledWith({
      title: 'Voice Error',
      description: 'No speech detected',
      variant: 'destructive'
    });
  });

  it('handles expense service errors', async () => {
    const { rerender } = render(<VoiceExpenseLogger />);

    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: false,
      transcript: 'log 50 for fuel',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      error: null,
      isSupported: true
    });

    mockAddExpense.mockRejectedValue(new Error('Network error'));

    rerender(<VoiceExpenseLogger />);

    await waitFor(() => {
      expect(mockAddExpense).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to add expense. Please try again.',
        variant: 'destructive'
      });
    });
  });

  it('shows driving mode toggle', async () => {
    const user = userEvent.setup();
    render(<VoiceExpenseLogger />);
    
    const drivingModeSwitch = screen.getByRole('switch', { name: /driving mode/i });
    expect(drivingModeSwitch).toBeInTheDocument();
    expect(drivingModeSwitch).not.toBeChecked();

    await user.click(drivingModeSwitch);
    expect(drivingModeSwitch).toBeChecked();
  });

  it('uses continuous listening in driving mode', async () => {
    const user = userEvent.setup();
    render(<VoiceExpenseLogger />);
    
    // Enable driving mode
    const drivingModeSwitch = screen.getByRole('switch', { name: /driving mode/i });
    await user.click(drivingModeSwitch);

    // Start listening
    const voiceButton = screen.getByRole('button', { name: /voice expense/i });
    await user.click(voiceButton);

    expect(mockStartListening).toHaveBeenCalledWith({
      continuous: true,
      language: 'en-US'
    });
  });

  it('stops listening when button is clicked while listening', async () => {
    const user = userEvent.setup();
    
    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: true,
      transcript: '',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      error: null,
      isSupported: true
    });

    render(<VoiceExpenseLogger />);
    
    const button = screen.getByRole('button');
    await user.click(button);

    expect(mockStopListening).toHaveBeenCalled();
  });

  it('clears transcript after processing', async () => {
    const { rerender } = render(<VoiceExpenseLogger />);

    // First render with transcript
    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: false,
      transcript: 'log 30 for food',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      error: null,
      isSupported: true
    });

    mockAddExpense.mockResolvedValue({ id: 1, amount: 30, category: 'food' });

    rerender(<VoiceExpenseLogger />);

    await waitFor(() => {
      expect(mockAddExpense).toHaveBeenCalled();
    });

    // Simulate transcript being cleared
    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: false,
      transcript: '',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      error: null,
      isSupported: true
    });

    rerender(<VoiceExpenseLogger />);

    // Should not process empty transcript
    expect(mockAddExpense).toHaveBeenCalledTimes(1);
  });

  it('shows proper visual feedback during different states', () => {
    const { rerender } = render(<VoiceExpenseLogger />);

    // Not listening state
    expect(screen.getByRole('button')).toHaveClass('bg-blue-600');
    
    // Listening state
    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: true,
      transcript: '',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      error: null,
      isSupported: true
    });

    rerender(<VoiceExpenseLogger />);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
    
    // Processing state (with transcript)
    (useSpeechRecognition as Mock).mockReturnValue({
      isListening: false,
      transcript: 'log 25 for parking',
      startListening: mockStartListening,
      stopListening: mockStopListening,
      error: null,
      isSupported: true
    });

    rerender(<VoiceExpenseLogger />);
    expect(screen.getByText('"log 25 for parking"')).toBeInTheDocument();
  });
});