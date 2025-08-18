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
    hasId: typeof obj.id === 'string' && obj.id.length > 0,
    hasDate: obj.date instanceof Date,
    validDate: obj.date instanceof Date && !isNaN(obj.date.getTime()),
    recentDate: obj.date instanceof Date && obj.date.getFullYear() > 1900,
    hasDescription: typeof obj.description === 'string',
    hasAmount: typeof obj.amount === 'number',
    validAmount: typeof obj.amount === 'number' && obj.amount >= 0 && !isNaN(obj.amount), // Allow 0 amounts and check for NaN
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
    
    // Try to fix common issues before validation
    const fixed = attemptTransactionFix(transaction);
    
    if (isValidBankTransaction(fixed)) {
      validTransactions.push(fixed);
      console.log('✅ Added to valid transactions');
    } else {
      invalidTransactions.push({ index, transaction: fixed });
      console.log('❌ Added to invalid transactions');
      console.log('❌ Transaction that failed:', fixed);
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

// Attempt to fix common transaction issues
const attemptTransactionFix = (transaction: any): any => {
  const fixed = { ...transaction };
  
  // Fix date if it's a string
  if (typeof fixed.date === 'string') {
    try {
      fixed.date = new Date(fixed.date);
      console.log('🔧 Fixed date from string to Date object');
    } catch (e) {
      console.log('❌ Could not fix date');
    }
  }
  
  // Ensure amount is a number
  if (typeof fixed.amount === 'string') {
    fixed.amount = parseFloat(fixed.amount) || 0;
    console.log('🔧 Fixed amount from string to number');
  }
  
  // Ensure type is valid
  if (!['debit', 'credit'].includes(fixed.type)) {
    fixed.type = fixed.amount < 0 ? 'debit' : 'credit';
    console.log('🔧 Fixed transaction type');
  }
  
  // Ensure isRecurring exists
  if (typeof fixed.isRecurring !== 'boolean') {
    fixed.isRecurring = false;
    console.log('🔧 Fixed isRecurring flag');
  }
  
  // Ensure redactedFields is an array
  if (!Array.isArray(fixed.redactedFields)) {
    fixed.redactedFields = [];
    console.log('🔧 Fixed redactedFields array');
  }
  
  // Ensure description is a string
  if (typeof fixed.description !== 'string') {
    fixed.description = String(fixed.description || 'Unknown');
    console.log('🔧 Fixed description to string');
  }
  
  // Ensure id exists
  if (!fixed.id || typeof fixed.id !== 'string') {
    fixed.id = `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log('🔧 Generated missing ID');
  }
  
  return fixed;
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