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
  console.log('🔍 VALIDATING TRANSACTION:', obj);
  
  const checks = {
    isObject: typeof obj === 'object' && obj !== null,
    hasId: typeof obj.id === 'string',
    hasDate: obj.date instanceof Date,
    validDate: obj.date instanceof Date && !isNaN(obj.date.getTime()),
    recentDate: obj.date instanceof Date && obj.date.getFullYear() > 1900,
    hasDescription: typeof obj.description === 'string',
    hasAmount: typeof obj.amount === 'number',
    validAmount: typeof obj.amount === 'number' && obj.amount > 0, // Changed from >= to > to exclude 0
    validType: ['debit', 'credit'].includes(obj.type),
    hasRecurring: typeof obj.isRecurring === 'boolean',
    hasRedactedFields: Array.isArray(obj.redactedFields)
  };
  
  console.log('📊 Validation checks:', checks);
  
  const isValid = Object.values(checks).every(check => check === true);
  console.log(isValid ? '✅ Transaction VALID' : '❌ Transaction INVALID');
  
  if (!isValid) {
    const failedChecks = Object.entries(checks)
      .filter(([key, value]) => !value)
      .map(([key]) => key);
    console.log('❌ Failed checks:', failedChecks);
  }
  
  return isValid;
};

export const validateTransactionArray = (transactions: any[]): BankTransaction[] => {
  console.log('🔍 STARTING TRANSACTION ARRAY VALIDATION');
  console.log('📊 Input array length:', transactions.length);
  console.log('📊 Input array:', transactions);
  
  if (!Array.isArray(transactions)) {
    throw new Error('Expected array of transactions');
  }
  
  const validTransactions: BankTransaction[] = [];
  const invalidTransactions: any[] = [];
  
  transactions.forEach((transaction, index) => {
    console.log(`\n🔍 VALIDATING TRANSACTION ${index + 1}/${transactions.length}:`);
    
    if (isValidBankTransaction(transaction)) {
      validTransactions.push(transaction);
      console.log('✅ Added to valid transactions');
    } else {
      invalidTransactions.push({ index, transaction });
      console.log('❌ Added to invalid transactions');
    }
  });
  
  console.log('\n📊 VALIDATION SUMMARY:');
  console.log('✅ Valid transactions:', validTransactions.length);
  console.log('❌ Invalid transactions:', invalidTransactions.length);
  
  if (invalidTransactions.length > 0) {
    console.log('❌ Invalid transaction details:', invalidTransactions);
  }
  
  if (validTransactions.length > 0) {
    console.log('✅ Sample valid transaction:', validTransactions[0]);
    console.table(validTransactions.slice(0, 3)); // Show first 3 in table format
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