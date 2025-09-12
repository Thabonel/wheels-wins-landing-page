// Note: Excel parsing requires server-side processing for full compatibility
// This is a fallback that converts Excel to CSV format

interface ParsedTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  originalData: Record<string, any>;
}

export const parseExcelFile = (file: File): Promise<ParsedTransaction[]> => {
  return new Promise((resolve, reject) => {
    // For now, suggest conversion to CSV
    reject(new Error('Excel files require conversion to CSV format. Please save your Excel file as CSV and try again.'));
  });
};

const parseTransactions = (rawData: any[]): ParsedTransaction[] => {
  const transactions: ParsedTransaction[] = [];
  
  if (rawData.length === 0) {
    return transactions;
  }
  
  // Detect column mapping from first row
  const columnMap = detectColumns(rawData[0]);
  
  for (const row of rawData) {
    try {
      const transaction = parseTransaction(row, columnMap);
      if (transaction) {
        transactions.push(transaction);
      }
    } catch (error) {
      console.warn('Failed to parse transaction row:', row, error);
    }
  }
  
  return transactions;
};

const detectColumns = (sampleRow: Record<string, any>): Record<string, string> => {
  const columnMap: Record<string, string> = {};
  const keys = Object.keys(sampleRow);
  
  // Common patterns for different banks
  const patterns = {
    date: ['date', 'transaction date', 'trans date', 'posting date', 'value date', 'datum'],
    description: ['description', 'memo', 'narrative', 'details', 'transaction', 'particulars', 'reference'],
    amount: ['amount', 'value', 'transaction amount', 'sum'],
    debit: ['debit', 'withdrawal', 'out', 'expense', 'payment'],
    credit: ['credit', 'deposit', 'in', 'income', 'receipt'],
    balance: ['balance', 'running balance', 'closing balance', 'available'],
    type: ['type', 'transaction type', 'trans type', 'category'],
  };
  
  for (const key of keys) {
    const lowerKey = key.toLowerCase().trim();
    
    for (const [field, fieldPatterns] of Object.entries(patterns)) {
      if (fieldPatterns.some(pattern => lowerKey.includes(pattern))) {
        if (field === 'debit' || field === 'credit') {
          columnMap[field] = key;
        } else {
          columnMap[field] = columnMap[field] || key;
        }
      }
    }
  }
  
  return columnMap;
};

const parseTransaction = (row: Record<string, any>, columnMap: Record<string, string>): ParsedTransaction | null => {
  // Extract date
  let date: Date | null = null;
  
  const dateField = columnMap.date || findDateField(row);
  if (dateField) {
    date = parseDate(row[dateField]);
  }
  
  if (!date) return null;
  
  // Extract description
  const descriptionField = columnMap.description || findDescriptionField(row);
  const description = row[descriptionField] || 'Unknown Transaction';
  
  // Extract amount and type
  let amount = 0;
  let type: 'debit' | 'credit' = 'debit';
  
  // Check for separate debit/credit columns
  if (columnMap.debit && columnMap.credit) {
    const debitAmount = parseAmount(row[columnMap.debit]);
    const creditAmount = parseAmount(row[columnMap.credit]);
    
    if (debitAmount > 0) {
      amount = debitAmount;
      type = 'debit';
    } else if (creditAmount > 0) {
      amount = creditAmount;
      type = 'credit';
    }
  } 
  // Check for single amount column
  else if (columnMap.amount) {
    amount = parseAmount(row[columnMap.amount]);
    
    // Check if there's a type column
    if (columnMap.type) {
      const transType = String(row[columnMap.type]).toLowerCase();
      type = transType.includes('credit') || transType.includes('deposit') ? 'credit' : 'debit';
    } else {
      // Negative amounts are typically debits
      type = amount < 0 ? 'debit' : 'credit';
    }
    
    amount = Math.abs(amount);
  }
  // Try to find amount in any numeric column
  else {
    const amountField = findAmountField(row);
    if (amountField) {
      amount = parseAmount(row[amountField]);
      type = amount < 0 ? 'debit' : 'credit';
      amount = Math.abs(amount);
    }
  }
  
  if (amount === 0) return null;
  
  return {
    id: generateTransactionId(date, description, amount),
    date,
    description: cleanDescription(String(description)),
    amount,
    type,
    originalData: row,
  };
};

const findDateField = (row: Record<string, any>): string | null => {
  for (const [key, value] of Object.entries(row)) {
    if (value && (value instanceof Date || isDateString(String(value)))) {
      return key;
    }
  }
  return null;
};

const findDescriptionField = (row: Record<string, any>): string | null => {
  // Look for the longest string field that's not a date
  let longestField: string | null = null;
  let longestLength = 0;
  
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'string' && !isDateString(value) && !isNumericString(value)) {
      if (value.length > longestLength) {
        longestLength = value.length;
        longestField = key;
      }
    }
  }
  
  return longestField;
};

const findAmountField = (row: Record<string, any>): string | null => {
  for (const [key, value] of Object.entries(row)) {
    const lowerKey = key.toLowerCase();
    
    // Skip balance fields
    if (lowerKey.includes('balance')) continue;
    
    // Look for numeric values
    if (typeof value === 'number' && value !== 0) {
      return key;
    }
    
    // Look for numeric strings
    if (typeof value === 'string' && isNumericString(value)) {
      const parsed = parseAmount(value);
      if (parsed !== 0) {
        return key;
      }
    }
  }
  
  return null;
};

const parseDate = (value: any): Date | null => {
  if (!value) return null;
  
  // Already a Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  
  // Excel serial date number
  if (typeof value === 'number' && value > 25569) {
    // Excel dates start from 1900-01-01
    const excelEpoch = new Date(1900, 0, 1);
    const msPerDay = 24 * 60 * 60 * 1000;
    return new Date(excelEpoch.getTime() + (value - 2) * msPerDay);
  }
  
  // String date
  const dateStr = String(value).trim();
  
  // Try standard parsing
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY format
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    
    if (day > 12) {
      // Definitely DD/MM/YYYY
      return new Date(year, month - 1, day);
    } else if (month > 12) {
      // Definitely MM/DD/YYYY
      return new Date(year, day - 1, month);
    } else {
      // Assume DD/MM/YYYY for ambiguous dates
      return new Date(year, month - 1, day);
    }
  }
  
  return null;
};

const parseAmount = (value: any): number => {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Remove currency symbols, spaces, and thousands separators
    let cleaned = value.replace(/[£$€¥₹\s,]/g, '').trim();
    
    // Handle parentheses for negative numbers
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = `-${  cleaned.slice(1, -1)}`;
    }
    
    // Handle CR/DR notation
    if (cleaned.endsWith('CR') || cleaned.endsWith('cr')) {
      cleaned = cleaned.slice(0, -2);
    } else if (cleaned.endsWith('DR') || cleaned.endsWith('dr')) {
      cleaned = `-${  cleaned.slice(0, -2)}`;
    }
    
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  }
  
  return 0;
};

const isDateString = (str: string): boolean => {
  // Common date patterns
  const datePatterns = [
    /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/,
    /^\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/,
    /^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i,
  ];
  
  return datePatterns.some(pattern => pattern.test(str));
};

const isNumericString = (str: string): boolean => {
  // Check if string represents a number (including currency)
  const cleaned = str.replace(/[£$€¥₹\s,()]/g, '');
  return !isNaN(parseFloat(cleaned)) && !isNaN(Number(cleaned));
};

const cleanDescription = (description: string): string => {
  // Remove extra whitespace
  let cleaned = description.replace(/\s+/g, ' ').trim();
  
  // Remove common bank reference patterns
  cleaned = cleaned.replace(/REF[:\s]*[\w\d]+/gi, '');
  cleaned = cleaned.replace(/TXN[:\s]*[\w\d]+/gi, '');
  cleaned = cleaned.replace(/\*{3,}\d{4}/g, '****'); // Mask card numbers
  
  // Remove long alphanumeric sequences (likely reference numbers)
  cleaned = cleaned.replace(/\b[A-Z0-9]{15,}\b/g, '');
  
  return cleaned.trim();
};

const generateTransactionId = (date: Date, description: string, amount: number): string => {
  const dateStr = date.toISOString().split('T')[0];
  const descHash = description.substring(0, 10).replace(/\W/g, '');
  const amountStr = Math.round(amount * 100).toString();
  const random = Math.random().toString(36).substring(7);
  
  return `${dateStr}-${descHash}-${amountStr}-${random}`;
};