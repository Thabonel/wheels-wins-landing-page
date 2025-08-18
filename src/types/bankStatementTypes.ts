/**
 * Bank Statement Processing Types
 * Ensures consistency across all bank statement components
 */

// Base transaction interface for bank statement processing
export interface BankTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  category?: string;
  merchantName?: string;
  isRecurring: boolean;
  redactedFields: string[];
  hash_signature?: string;
  confidence_score?: number;
}

// Raw transaction data from CSV parsing (before processing)
export interface RawTransaction {
  [key: string]: string | number | Date;
}

// Processing session information
export interface ProcessingSession {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transactionCount: number;
}

// Stage-specific interfaces
export interface UploadStageProps {
  onFileSelect: (file: File) => void;
}

export interface ProcessingStageProps {
  file: File;
  session: ProcessingSession;
  onComplete: (transactions: BankTransaction[]) => void;
  onError?: (error: string) => void;
}

export interface ReviewStageProps {
  transactions: BankTransaction[];
  onImport: () => void;
  onCancel: () => void;
}

// Validation functions
export const isValidBankTransaction = (obj: any): obj is BankTransaction => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    obj.date instanceof Date &&
    !isNaN(obj.date.getTime()) &&
    obj.date.getFullYear() > 1900 &&
    typeof obj.description === 'string' &&
    typeof obj.amount === 'number' &&
    obj.amount >= 0 &&
    ['debit', 'credit'].includes(obj.type) &&
    typeof obj.isRecurring === 'boolean' &&
    Array.isArray(obj.redactedFields)
  );
};

export const validateTransactionArray = (transactions: any[]): BankTransaction[] => {
  if (!Array.isArray(transactions)) {
    throw new Error('Expected array of transactions');
  }
  
  const validTransactions: BankTransaction[] = [];
  const errors: string[] = [];
  
  transactions.forEach((transaction, index) => {
    if (isValidBankTransaction(transaction)) {
      validTransactions.push(transaction);
    } else {
      errors.push(`Transaction at index ${index} is invalid: ${JSON.stringify(transaction)}`);
    }
  });
  
  if (errors.length > 0) {
    console.warn('Transaction validation errors:', errors);
  }
  
  return validTransactions;
};

// Type guards for debugging
export const debugTransactionData = (transaction: any, label: string): void => {
  console.log(`[DEBUG] ${label}:`, {
    transaction,
    id: typeof transaction?.id,
    date: transaction?.date instanceof Date ? 'Date' : typeof transaction?.date,
    dateValue: transaction?.date,
    description: typeof transaction?.description,
    amount: typeof transaction?.amount,
    amountValue: transaction?.amount,
    type: typeof transaction?.type,
    isRecurring: typeof transaction?.isRecurring,
    redactedFields: Array.isArray(transaction?.redactedFields) ? 'Array' : typeof transaction?.redactedFields
  });
};