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
    // Try to find amount in any column that looks like it contains amounts
    for (const [key, value] of Object.entries(row)) {
      const lowerKey = key.toLowerCase();
      // Skip balance columns and date columns
      if (lowerKey.includes('balance') || lowerKey.includes('date')) continue;
      
      const parsedAmount = parseAmount(value);
      if (parsedAmount !== 0) {
        amount = Math.abs(parsedAmount);
        type = parsedAmount < 0 ? 'debit' : 'credit';
        break;
      }
    }
  }
  
  if (amount === 0) {
    console.warn('No amount found in row:', row);
    return null;
  }
  
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
  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return dateValue;
  }
  
  // Try to parse string date
  const dateStr = String(dateValue).trim();
  
  // Try manual parsing for common formats first
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [p1, p2, p3] = parts.map(p => parseInt(p));
    
    // Check if all parts are valid numbers
    if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
      let year, month, day;
      
      // YYYY-MM-DD or YYYY/MM/DD
      if (p1 > 1900 && p1 < 2100) {
        year = p1;
        month = p2;
        day = p3;
      }
      // DD/MM/YYYY or DD-MM-YYYY (if day > 12, it must be DD/MM/YYYY)
      else if (p1 > 12 && p1 <= 31) {
        day = p1;
        month = p2;
        year = p3;
      }
      // MM/DD/YYYY or MM-DD-YYYY (if month > 12, swap)
      else if (p2 > 12 && p2 <= 31) {
        month = p1;
        day = p2;
        year = p3;
      }
      // Default to MM/DD/YYYY for ambiguous cases
      else {
        month = p1;
        day = p2;
        year = p3;
      }
      
      // Adjust 2-digit years
      if (year < 100) {
        year = year > 50 ? 1900 + year : 2000 + year;
      }
      
      // Create date and validate it
      const date = new Date(year, month - 1, day);
      if (!isNaN(date.getTime()) && 
          date.getFullYear() === year && 
          date.getMonth() === month - 1 && 
          date.getDate() === day) {
        return date;
      }
    }
  }
  
  // Try parsing with Date constructor as fallback
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900) {
    return parsed;
  }
  
  console.warn('Failed to parse date:', dateStr);
  return null;
};

const parseAmount = (value: any): number => {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    // Remove currency symbols, spaces, and commas
    let cleaned = value.replace(/[$£€¥,\s]/g, '').trim();
    
    // Handle empty strings
    if (!cleaned || cleaned === '-' || cleaned === '') {
      return 0;
    }
    
    // Handle parentheses for negative numbers (e.g., "(100.00)")
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }
    
    // Handle CR/DR notation (Credit/Debit)
    const isCR = cleaned.toUpperCase().includes('CR');
    const isDR = cleaned.toUpperCase().includes('DR');
    cleaned = cleaned.replace(/[CDR]/gi, '').trim();
    
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) {
      return 0;
    }
    
    // Apply CR/DR sign convention (CR is usually positive/credit, DR is negative/debit)
    if (isDR && parsed > 0) {
      return -parsed;
    }
    
    return parsed;
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