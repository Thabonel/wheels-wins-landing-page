import { useEffect } from 'react';

interface ExpenseData {
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface PamExpenseIntegrationProps {
  onExpenseReceived?: (expenseData: ExpenseData) => void;
  onNavigateToExpenses?: () => void;
}

/**
 * Hook for integrating PAM expense tracking with financial components
 */
export function usePamExpenseIntegration({ 
  onExpenseReceived, 
  onNavigateToExpenses 
}: PamExpenseIntegrationProps = {}) {
  
  useEffect(() => {
    const handleAddExpense = async (event: CustomEvent<ExpenseData>) => {
      console.log('💰 PAM expense integration: Adding expense', event.detail);
      
      if (onExpenseReceived) {
        onExpenseReceived(event.detail);
      } else {
        // Default behavior: try to add expense via form
        const expenseData = event.detail;
        
        // Try to open expense form
        const addExpenseButton = document.querySelector('#add-expense-btn, [data-action="add-expense"], button:has-text("Add Expense")') as HTMLButtonElement;
        if (addExpenseButton) {
          addExpenseButton.click();
          
          // Wait for form to open, then fill it
          setTimeout(() => {
            const amountInput = document.querySelector('#expense-amount, [name="amount"], input[type="number"]') as HTMLInputElement;
            const categorySelect = document.querySelector('#expense-category, [name="category"], select') as HTMLSelectElement;
            const descriptionInput = document.querySelector('#expense-description, [name="description"], textarea') as HTMLTextAreaElement;
            const dateInput = document.querySelector('#expense-date, [name="date"], input[type="date"]') as HTMLInputElement;
            
            if (amountInput) {
              amountInput.value = expenseData.amount.toString();
              amountInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            if (categorySelect) {
              categorySelect.value = expenseData.category;
              categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            if (descriptionInput) {
              descriptionInput.value = expenseData.description;
              descriptionInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            if (dateInput) {
              dateInput.value = expenseData.date;
              dateInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
            
            // Auto-submit if all fields are filled
            const submitButton = document.querySelector('#submit-expense, [type="submit"]') as HTMLButtonElement;
            if (submitButton && amountInput?.value && categorySelect?.value) {
              setTimeout(() => submitButton.click(), 500);
            }
          }, 300);
        }
      }
    };

    const handleNavigateToExpenses = () => {
      console.log('💰 PAM expense integration: Navigating to expenses');
      if (onNavigateToExpenses) {
        onNavigateToExpenses();
      }
    };

    // Listen for PAM expense events
    window.addEventListener('pam-add-expense', handleAddExpense as EventListener);
    window.addEventListener('pam-navigate-expenses', handleNavigateToExpenses);

    return () => {
      window.removeEventListener('pam-add-expense', handleAddExpense as EventListener);
      window.removeEventListener('pam-navigate-expenses', handleNavigateToExpenses);
    };
  }, [onExpenseReceived, onNavigateToExpenses]);

  // Helper function to manually trigger expense creation
  const addExpense = (amount: number, category: string, description: string, date?: string) => {
    window.dispatchEvent(new CustomEvent('pam-add-expense', {
      detail: { 
        amount, 
        category, 
        description, 
        date: date || new Date().toISOString().split('T')[0] 
      }
    }));
  };

  return {
    addExpense
  };
}