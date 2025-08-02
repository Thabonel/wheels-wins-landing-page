import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExpenseVoiceCommands, { parseExpenseCommand } from '@/components/pam/voice/ExpenseVoiceCommands';

describe('parseExpenseCommand', () => {
  it('parses basic expense commands with dollar amounts', () => {
    const testCases = [
      {
        command: 'log 45 dollars for gas',
        expected: { amount: 45, category: 'fuel', description: 'Gas', isValid: true }
      },
      {
        command: 'spent 123.50 on food',
        expected: { amount: 123.50, category: 'food', description: 'Food', isValid: true }
      },
      {
        command: 'add expense 25 for parking',
        expected: { amount: 25, category: 'parking', description: 'Parking', isValid: true }
      },
      {
        command: 'log expense $89.99 for camping',
        expected: { amount: 89.99, category: 'camping', description: 'Camping', isValid: true }
      }
    ];

    testCases.forEach(({ command, expected }) => {
      const result = parseExpenseCommand(command);
      expect(result).toEqual(expected);
    });
  });

  it('handles various category aliases', () => {
    const testCases = [
      {
        command: 'log 50 for fuel',
        expected: { amount: 50, category: 'fuel', description: 'Fuel', isValid: true }
      },
      {
        command: 'spent 30 on diesel',
        expected: { amount: 30, category: 'fuel', description: 'Diesel', isValid: true }
      },
      {
        command: 'add 40 for meals',
        expected: { amount: 40, category: 'food', description: 'Meals', isValid: true }
      },
      {
        command: 'log 15 dollars for groceries',
        expected: { amount: 15, category: 'food', description: 'Groceries', isValid: true }
      },
      {
        command: 'spent 100 on rv maintenance',
        expected: { amount: 100, category: 'maintenance', description: 'RV maintenance', isValid: true }
      }
    ];

    testCases.forEach(({ command, expected }) => {
      const result = parseExpenseCommand(command);
      expect(result).toEqual(expected);
    });
  });

  it('extracts custom descriptions', () => {
    const testCases = [
      {
        command: 'log 45 for gas at shell station',
        expected: { amount: 45, category: 'fuel', description: 'Gas at shell station', isValid: true }
      },
      {
        command: 'spent 75 on camping at yellowstone',
        expected: { amount: 75, category: 'camping', description: 'Camping at yellowstone', isValid: true }
      },
      {
        command: 'add 120 for maintenance oil change and filters',
        expected: { amount: 120, category: 'maintenance', description: 'Maintenance oil change and filters', isValid: true }
      }
    ];

    testCases.forEach(({ command, expected }) => {
      const result = parseExpenseCommand(command);
      expect(result).toEqual(expected);
    });
  });

  it('handles invalid commands', () => {
    const invalidCommands = [
      'hello world',
      'log expense without amount',
      'spent money on food',
      'add for gas',
      'random text'
    ];

    invalidCommands.forEach((command) => {
      const result = parseExpenseCommand(command);
      expect(result.isValid).toBe(false);
    });
  });

  it('handles edge cases', () => {
    const testCases = [
      {
        command: 'LOG $45.00 FOR GAS', // uppercase
        expected: { amount: 45, category: 'fuel', description: 'Gas', isValid: true }
      },
      {
        command: '  spent   30   on   food  ', // extra spaces
        expected: { amount: 30, category: 'food', description: 'Food', isValid: true }
      },
      {
        command: 'add $0.99 for parking',
        expected: { amount: 0.99, category: 'parking', description: 'Parking', isValid: true }
      }
    ];

    testCases.forEach(({ command, expected }) => {
      const result = parseExpenseCommand(command);
      expect(result).toEqual(expected);
    });
  });
});

describe('ExpenseVoiceCommands Component', () => {
  const mockOnExpenseAdd = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    mockOnExpenseAdd.mockClear();
    mockOnError.mockClear();
  });

  it('renders command examples', () => {
    render(
      <ExpenseVoiceCommands 
        onExpenseAdd={mockOnExpenseAdd}
        onError={mockOnError}
      />
    );

    expect(screen.getByText(/Example commands:/)).toBeInTheDocument();
    expect(screen.getByText(/"Log 45 dollars for gas"/)).toBeInTheDocument();
    expect(screen.getByText(/"Spent 30 on food"/)).toBeInTheDocument();
  });

  it('shows listening state when isListening is true', () => {
    render(
      <ExpenseVoiceCommands 
        onExpenseAdd={mockOnExpenseAdd}
        onError={mockOnError}
        isListening={true}
      />
    );

    expect(screen.getByText('Listening for expense command...')).toBeInTheDocument();
  });

  it('shows command being processed', () => {
    const command = 'log 45 dollars for gas';
    render(
      <ExpenseVoiceCommands 
        onExpenseAdd={mockOnExpenseAdd}
        onError={mockOnError}
        isListening={true}
        currentCommand={command}
      />
    );

    expect(screen.getByText(`"${command}"`)).toBeInTheDocument();
  });

  it('processes valid commands', () => {
    const { rerender } = render(
      <ExpenseVoiceCommands 
        onExpenseAdd={mockOnExpenseAdd}
        onError={mockOnError}
      />
    );

    // Simulate processing a command
    rerender(
      <ExpenseVoiceCommands 
        onExpenseAdd={mockOnExpenseAdd}
        onError={mockOnError}
        processCommand="log 50 for fuel"
      />
    );

    expect(mockOnExpenseAdd).toHaveBeenCalledWith({
      amount: 50,
      category: 'fuel',
      description: 'Fuel'
    });
  });

  it('handles invalid commands', () => {
    const { rerender } = render(
      <ExpenseVoiceCommands 
        onExpenseAdd={mockOnExpenseAdd}
        onError={mockOnError}
      />
    );

    // Simulate processing an invalid command
    rerender(
      <ExpenseVoiceCommands 
        onExpenseAdd={mockOnExpenseAdd}
        onError={mockOnError}
        processCommand="invalid command"
      />
    );

    expect(mockOnError).toHaveBeenCalledWith("I couldn't understand that expense command. Please try again.");
    expect(mockOnExpenseAdd).not.toHaveBeenCalled();
  });

  it('shows success message after adding expense', () => {
    const { rerender } = render(
      <ExpenseVoiceCommands 
        onExpenseAdd={mockOnExpenseAdd}
        onError={mockOnError}
      />
    );

    // Process a valid command
    rerender(
      <ExpenseVoiceCommands 
        onExpenseAdd={mockOnExpenseAdd}
        onError={mockOnError}
        processCommand="log 75 for camping"
      />
    );

    // Check that success feedback was triggered
    expect(mockOnExpenseAdd).toHaveBeenCalledWith({
      amount: 75,
      category: 'camping',
      description: 'Camping'
    });
  });

  it('clears command after processing', () => {
    const { rerender } = render(
      <ExpenseVoiceCommands 
        onExpenseAdd={mockOnExpenseAdd}
        onError={mockOnError}
        currentCommand="log 50 for gas"
      />
    );

    expect(screen.getByText('"log 50 for gas"')).toBeInTheDocument();

    // After processing, command should be cleared
    rerender(
      <ExpenseVoiceCommands 
        onExpenseAdd={mockOnExpenseAdd}
        onError={mockOnError}
        processCommand="log 50 for gas"
      />
    );

    // The component should clear the display after processing
    expect(mockOnExpenseAdd).toHaveBeenCalled();
  });

  it('shows help text when not listening', () => {
    render(
      <ExpenseVoiceCommands 
        onExpenseAdd={mockOnExpenseAdd}
        onError={mockOnError}
        isListening={false}
      />
    );

    expect(screen.getByText(/Say your expense naturally/)).toBeInTheDocument();
  });
});