// Using built-in CSV parsing to avoid external dependencies

interface RawTransaction {
  date: string;
  description: string;
  amount: string | number;
  balance?: string | number;
  type?: string;
  [key: string]: any;
}

interface ParsedTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  originalData: Record<string, any>;
}

export const parseCsvFile = (file: File): Promise<ParsedTransaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          reject(new Error('CSV file must have at least a header and one data row'));
          return;
        }
        
        // Parse header row
        const headers = parseCSVLine(lines[0]);
        
        // Parse data rows
        const rawData: RawTransaction[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseCSVLine(lines[i]);
          if (values.length === headers.length) {
            const row: any = {};
            headers.forEach((header, index) => {
              row[header.trim()] = values[index]?.trim() || '';
            });
            rawData.push(row);
          }
        }
        
        const transactions = parseTransactions(rawData);
        resolve(transactions);
      } catch (error) {
        reject(new Error(`CSV parsing failed: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    
    reader.readAsText(file);
  });
};

// Simple CSV line parser
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

const parseTransactions = (rawData: RawTransaction[]): ParsedTransaction[] => {
  const transactions: ParsedTransaction[] = [];
  
  // Detect column mapping
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

const detectColumns = (sampleRow: RawTransaction): Record<string, string> => {
  const columnMap: Record<string, string> = {};
  const keys = Object.keys(sampleRow);
  
  // Common date column names
  const datePatterns = ['date', 'transaction date', 'trans date', 'posting date', 'value date'];
  // Common description column names
  const descriptionPatterns = ['description', 'memo', 'narrative', 'details', 'transaction description'];
  // Common amount column names
  const amountPatterns = ['amount', 'value', 'debit', 'credit', 'transaction amount'];
  // Common balance column names
  const balancePatterns = ['balance', 'running balance', 'closing balance'];
  
  for (const key of keys) {
    const lowerKey = key.toLowerCase().trim();
    
    if (datePatterns.some(p => lowerKey.includes(p))) {
      columnMap.date = key;
    }
    if (descriptionPatterns.some(p => lowerKey.includes(p))) {
      columnMap.description = key;
    }
    if (amountPatterns.some(p => lowerKey.includes(p))) {
      if (lowerKey.includes('debit')) {
        columnMap.debit = key;
      } else if (lowerKey.includes('credit')) {
        columnMap.credit = key;
      } else {
        columnMap.amount = key;
      }
    }
    if (balancePatterns.some(p => lowerKey.includes(p))) {
      columnMap.balance = key;
    }
  }
  
  return columnMap;
};

const parseTransaction = (row: RawTransaction, columnMap: Record<string, string>): ParsedTransaction | null => {
  // Extract date
  const dateValue = row[columnMap.date] || row.date || row.Date;
  if (!dateValue) return null;
  
  const date = parseDate(dateValue);
  if (!date) return null;
  
  // Extract description
  const description = row[columnMap.description] || 
                     row.description || 
                     row.Description || 
                     row.memo || 
                     row.Memo || 
                     'Unknown Transaction';
  
  // Extract amount and determine type
  let amount = 0;
  let type: 'debit' | 'credit' = 'debit';
  
  if (columnMap.debit && columnMap.credit) {
    // Separate debit/credit columns
    const debitAmount = parseAmount(row[columnMap.debit]);
    const creditAmount = parseAmount(row[columnMap.credit]);
    
    if (debitAmount > 0) {
      amount = debitAmount;
      type = 'debit';
    } else if (creditAmount > 0) {
      amount = creditAmount;
      type = 'credit';
    }
  } else if (columnMap.amount) {
    // Single amount column
    amount = parseAmount(row[columnMap.amount]);
    type = amount < 0 ? 'debit' : 'credit';
    amount = Math.abs(amount);
  } else {
    // Try to find amount in any numeric column
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'number' && value !== 0 && !key.toLowerCase().includes('balance')) {
        amount = Math.abs(value);
        type = value < 0 ? 'debit' : 'credit';
        break;
      }
    }
  }
  
  if (amount === 0) return null;
  
  return {
    id: generateTransactionId(date, description, amount),
    date,
    description: cleanDescription(description),
    amount,
    type,
    originalData: row,
  };
};

const parseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  
  // If already a Date object
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  // Try to parse string date
  const dateStr = String(dateValue);
  
  // Common date formats
  const formats = [
    /^\d{4}-\d{2}-\d{2}$/,        // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/,      // MM/DD/YYYY or DD/MM/YYYY
    /^\d{2}-\d{2}-\d{4}$/,        // MM-DD-YYYY or DD-MM-YYYY
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,  // M/D/YYYY
    /^\d{4}\/\d{2}\/\d{2}$/,      // YYYY/MM/DD
  ];
  
  // Try to parse with Date constructor
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Try manual parsing for DD/MM/YYYY format
  const parts = dateStr.split(/[\/\-]/);
  if (parts.length === 3) {
    // Assume DD/MM/YYYY if day > 12
    if (parseInt(parts[0]) > 12) {
      return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
    // Otherwise assume MM/DD/YYYY
    return new Date(`${parts[2]}-${parts[0]}-${parts[1]}`);
  }
  
  return null;
};

const parseAmount = (value: any): number => {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Remove currency symbols and commas
    const cleaned = value.replace(/[$£€¥,]/g, '').trim();
    
    // Handle parentheses for negative numbers
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      return -parseFloat(cleaned.slice(1, -1));
    }
    
    return parseFloat(cleaned) || 0;
  }
  
  return 0;
};

const cleanDescription = (description: string): string => {
  // Remove extra whitespace
  let cleaned = description.replace(/\s+/g, ' ').trim();
  
  // Remove common bank reference patterns
  cleaned = cleaned.replace(/REF:\s*\d+/gi, '');
  cleaned = cleaned.replace(/TXN:\s*\d+/gi, '');
  cleaned = cleaned.replace(/\*{4,}\d{4}/g, '****'); // Mask card numbers
  
  return cleaned;
};

const generateTransactionId = (date: Date, description: string, amount: number): string => {
  const dateStr = date.toISOString().split('T')[0];
  const descHash = description.substring(0, 10).replace(/\W/g, '');
  const amountStr = Math.round(amount * 100).toString();
  const random = Math.random().toString(36).substring(7);
  
  return `${dateStr}-${descHash}-${amountStr}-${random}`;
};