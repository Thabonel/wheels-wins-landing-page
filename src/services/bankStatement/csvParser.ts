// Using built-in CSV parsing to avoid external dependencies
import { BankTransaction, RawTransaction } from '@/types/bankStatementTypes';

interface ParsedTransaction extends BankTransaction {
  originalData?: Record<string, any>;
}

export const parseCsvFile = (file: File): Promise<ParsedTransaction[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        console.log('=== CSV PARSER DEBUG ===');
        console.log('File content length:', text.length);
        console.log('First 500 chars:', text.substring(0, 500));
        
        // Handle different line endings (Windows CRLF vs Unix LF)
        const lines = text.split(/\r?\n/).filter(line => line.trim());
        console.log('Total lines found:', lines.length);
        console.log('First 3 lines:', lines.slice(0, 3));
        
        if (lines.length < 2) {
          reject(new Error('CSV file must have at least a header and one data row'));
          return;
        }
        
        // Detect delimiter
        const delimiter = detectDelimiter(lines[0]);
        console.log('Detected delimiter:', delimiter === ',' ? 'comma' : delimiter === ';' ? 'semicolon' : delimiter);
        
        // Parse header row
        const headers = parseCSVLine(lines[0], delimiter);
        console.log('Headers found:', headers);
        console.log('Header count:', headers.length);
        
        // Parse data rows
        const rawData: RawTransaction[] = [];
        for (let i = 1; i < Math.min(lines.length, 5); i++) { // Log first few rows
          const values = parseCSVLine(lines[i], delimiter);
          console.log(`Row ${i} values:`, values);
          if (values.length === headers.length) {
            const row: any = {};
            headers.forEach((header, index) => {
              row[header.trim()] = values[index]?.trim() || '';
            });
            console.log(`Row ${i} object:`, row);
            rawData.push(row);
          } else {
            console.warn(`Row ${i} skipped: ${values.length} values vs ${headers.length} headers`);
          }
        }
        
        // Parse remaining rows without logging
        for (let i = 5; i < lines.length; i++) {
          const values = parseCSVLine(lines[i], delimiter);
          if (values.length === headers.length) {
            const row: any = {};
            headers.forEach((header, index) => {
              row[header.trim()] = values[index]?.trim() || '';
            });
            rawData.push(row);
          }
        }
        
        console.log('Total raw transactions:', rawData.length);
        console.log('Sample raw transaction:', rawData[0]);
        
        const transactions = parseTransactions(rawData);
        console.log('Parsed transactions:', transactions.length);
        console.log('Sample parsed transaction:', transactions[0]);
        resolve(transactions);
      } catch (error) {
        console.error('CSV parsing error:', error);
        reject(new Error(`CSV parsing failed: ${error}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };
    
    reader.readAsText(file);
  });
};

// Detect the delimiter used in the CSV
function detectDelimiter(headerLine: string): string {
  const delimiters = [',', ';', '\t', '|'];
  let maxCount = 0;
  let bestDelimiter = ',';
  
  for (const delimiter of delimiters) {
    const count = (headerLine.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }
  
  return bestDelimiter;
}

// Enhanced CSV line parser that handles quotes properly
function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote ("")
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  // Remove surrounding quotes from fields
  return result.map(field => {
    if (field.startsWith('"') && field.endsWith('"')) {
      return field.slice(1, -1).replace(/""/g, '"');
    }
    return field;
  });
}

const parseTransactions = (rawData: RawTransaction[]): ParsedTransaction[] => {
  const transactions: ParsedTransaction[] = [];
  
  if (rawData.length === 0) {
    console.error('No raw data to parse');
    return [];
  }
  
  // Detect column mapping
  const columnMap = detectColumns(rawData[0]);
  console.log('=== COLUMN DETECTION ===');
  console.log('Detected column mapping:', columnMap);
  console.log('Available columns:', Object.keys(rawData[0]));
  
  // Validate required columns
  if (!columnMap.date && !columnMap.Date) {
    console.error('ERROR: No date column detected!');
    console.log('Available columns:', Object.keys(rawData[0]));
  }
  if (!columnMap.amount && !columnMap.debit && !columnMap.credit) {
    console.error('ERROR: No amount column detected!');
    console.log('Available columns:', Object.keys(rawData[0]));
  }
  
  console.log(`🔄 Processing ${rawData.length} raw data rows`);
  
  for (const row of rawData) {
    try {
      const transaction = parseTransaction(row, columnMap);
      if (transaction) {
        transactions.push(transaction);
        console.log(`✅ Successfully parsed transaction ${transactions.length}`);
      } else {
        console.warn('❌ parseTransaction returned null for row:', row);
      }
    } catch (error) {
      console.warn('❌ Failed to parse transaction row:', row, error);
    }
  }
  
  console.log(`📊 CSV PARSING COMPLETE:`);
  console.log(`📊 Input rows: ${rawData.length}`);
  console.log(`📊 Parsed transactions: ${transactions.length}`);
  console.log(`📊 Success rate: ${((transactions.length / rawData.length) * 100).toFixed(1)}%`);
  
  return transactions;
};

const detectColumns = (sampleRow: RawTransaction): Record<string, string> => {
  const columnMap: Record<string, string> = {};
  const keys = Object.keys(sampleRow);
  
  console.log('Detecting columns from keys:', keys);
  
  // Extended patterns for better matching
  const datePatterns = [
    'date', 'transaction date', 'trans date', 'posting date', 'value date',
    'transaction_date', 'trans_date', 'txn date', 'txn_date', 'payment date',
    'process date', 'effective date', 'posted', 'posted date'
  ];
  
  const descriptionPatterns = [
    'description', 'memo', 'narrative', 'details', 'transaction description',
    'trans_description', 'merchant', 'payee', 'transaction', 'particulars',
    'reference', 'remarks', 'comment', 'transaction_details', 'payment_details'
  ];
  
  const amountPatterns = [
    'amount', 'value', 'debit', 'credit', 'transaction amount',
    'trans_amount', 'payment', 'withdrawal', 'deposit', 'charge',
    'transaction_value', 'money', 'sum', 'total', 'payment_amount'
  ];
  
  const balancePatterns = [
    'balance', 'running balance', 'closing balance', 'available balance',
    'current balance', 'ending balance', 'final balance', 'account balance'
  ];
  
  // Try exact match first, then partial match
  for (const key of keys) {
    const lowerKey = key.toLowerCase().trim().replace(/[_\-\s]+/g, ' ');
    
    // Date detection
    if (!columnMap.date) {
      if (datePatterns.some(p => lowerKey === p)) {
        columnMap.date = key;
        console.log(`Found exact date column: ${key}`);
      } else if (datePatterns.some(p => lowerKey.includes(p))) {
        columnMap.date = key;
        console.log(`Found partial date column: ${key}`);
      }
    }
    
    // Description detection
    if (!columnMap.description) {
      if (descriptionPatterns.some(p => lowerKey === p)) {
        columnMap.description = key;
        console.log(`Found exact description column: ${key}`);
      } else if (descriptionPatterns.some(p => lowerKey.includes(p))) {
        columnMap.description = key;
        console.log(`Found partial description column: ${key}`);
      }
    }
    
    // Amount detection
    if (lowerKey.includes('debit') || lowerKey === 'dr' || lowerKey.includes('withdrawal')) {
      columnMap.debit = key;
      console.log(`Found debit column: ${key}`);
    } else if (lowerKey.includes('credit') || lowerKey === 'cr' || lowerKey.includes('deposit')) {
      columnMap.credit = key;
      console.log(`Found credit column: ${key}`);
    } else if (!columnMap.amount) {
      if (amountPatterns.some(p => lowerKey === p)) {
        columnMap.amount = key;
        console.log(`Found exact amount column: ${key}`);
      } else if (amountPatterns.some(p => lowerKey.includes(p))) {
        columnMap.amount = key;
        console.log(`Found partial amount column: ${key}`);
      }
    }
    
    // Balance detection
    if (!columnMap.balance) {
      if (balancePatterns.some(p => lowerKey === p || lowerKey.includes(p))) {
        columnMap.balance = key;
        console.log(`Found balance column: ${key}`);
      }
    }
  }
  
  // Fallback: If no columns detected, try to guess based on position and content
  if (!columnMap.date && keys.length > 0) {
    // Check if first column looks like a date
    const firstValue = String(sampleRow[keys[0]]);
    if (firstValue.match(/\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}/)) {
      columnMap.date = keys[0];
      console.log(`Guessed date column by format: ${keys[0]}`);
    }
  }
  
  return columnMap;
};

const parseTransaction = (row: RawTransaction, columnMap: Record<string, string>): ParsedTransaction | null => {
  // Try multiple fallbacks for date
  let dateValue = null;
  if (columnMap.date) {
    dateValue = row[columnMap.date];
  }
  
  // Fallback: try common date field names
  if (!dateValue) {
    const dateFallbacks = ['Date', 'date', 'Transaction Date', 'Trans Date', 'Posted Date'];
    for (const fallback of dateFallbacks) {
      if (row[fallback]) {
        dateValue = row[fallback];
        console.log(`Using fallback date column: ${fallback}`);
        break;
      }
    }
  }
  
  // If still no date, try to find any column that looks like a date
  if (!dateValue) {
    for (const [key, value] of Object.entries(row)) {
      if (value && String(value).match(/\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}/)) {
        dateValue = value;
        console.log(`Found date-like value in column: ${key}`);
        break;
      }
    }
  }
  
  if (!dateValue) {
    console.warn('No date value found in row:', row);
    return null;
  }
  
  const date = parseDate(dateValue);
  if (!date) {
    console.warn('Failed to parse date:', dateValue);
    return null;
  }
  
  // Extract description with fallbacks
  let description = '';
  if (columnMap.description) {
    description = row[columnMap.description];
  }
  
  if (!description) {
    const descFallbacks = ['Description', 'description', 'Memo', 'memo', 'Details', 'Merchant', 'Payee'];
    for (const fallback of descFallbacks) {
      if (row[fallback]) {
        description = row[fallback];
        break;
      }
    }
  }
  
  // If still no description, use any non-numeric, non-date column
  if (!description) {
    for (const [key, value] of Object.entries(row)) {
      if (value && 
          !String(value).match(/^\d+\.?\d*$/) && 
          !String(value).match(/\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}/) &&
          String(value).length > 3) {
        description = String(value);
        break;
      }
    }
  }
  
  description = description || 'Unknown Transaction';
  
  // Extract amount and determine type
  let amount = 0;
  let type: 'debit' | 'credit' = 'debit';
  
  // Try mapped columns first
  if (columnMap.debit && columnMap.credit) {
    // Separate debit/credit columns
    const debitAmount = parseAmount(row[columnMap.debit]);
    const creditAmount = parseAmount(row[columnMap.credit]);
    
    if (debitAmount > 0) {
      amount = debitAmount;
      type = 'debit';
      console.log(`Found debit amount: ${amount}`);
    } else if (creditAmount > 0) {
      amount = creditAmount;
      type = 'credit';
      console.log(`Found credit amount: ${amount}`);
    }
  } else if (columnMap.amount) {
    // Single amount column
    amount = parseAmount(row[columnMap.amount]);
    type = amount < 0 ? 'debit' : 'credit';
    amount = Math.abs(amount);
    if (amount > 0) {
      console.log(`Found amount in single column: ${amount} (${type})`);
    }
  }
  
  // Fallback: try common amount field names
  if (amount === 0) {
    const amountFallbacks = ['Amount', 'amount', 'Value', 'Payment', 'Debit', 'Credit', 'Withdrawal', 'Deposit'];
    for (const fallback of amountFallbacks) {
      if (row[fallback]) {
        const parsedAmount = parseAmount(row[fallback]);
        if (parsedAmount !== 0) {
          amount = Math.abs(parsedAmount);
          type = parsedAmount < 0 ? 'debit' : 'credit';
          console.log(`Using fallback amount column '${fallback}': ${amount}`);
          break;
        }
      }
    }
  }
  
  // Last resort: find any numeric column that's not balance or date
  if (amount === 0) {
    console.log('Searching for amount in all columns...');
    for (const [key, value] of Object.entries(row)) {
      const lowerKey = key.toLowerCase();
      // Skip balance, date, and ID columns
      if (lowerKey.includes('balance') || 
          lowerKey.includes('date') || 
          lowerKey.includes('id') ||
          lowerKey.includes('reference') ||
          lowerKey.includes('check')) continue;
      
      const parsedAmount = parseAmount(value);
      if (parsedAmount !== 0) {
        amount = Math.abs(parsedAmount);
        type = parsedAmount < 0 ? 'debit' : 'credit';
        console.log(`Found amount in column '${key}': ${amount}`);
        break;
      }
    }
  }
  
  if (amount === 0) {
    console.error('No amount found in row:', row);
    console.log('All values:', Object.entries(row).map(([k, v]) => `${k}: ${v}`));
    return null;
  }
  
  const transaction = {
    id: generateTransactionId(date, description, amount),
    date,
    description: cleanDescription(description),
    amount,
    type,
    category: undefined,
    merchantName: undefined,
    isRecurring: false,
    redactedFields: [],
    hash_signature: generateTransactionId(date, description, amount),
    confidence_score: 1.0,
    originalData: row,
  };
  
  console.log('🏗️ CSV Parser created transaction:', transaction);
  console.log('🏗️ Date type:', typeof transaction.date, 'Is Date?', transaction.date instanceof Date);
  console.log('🏗️ Amount type:', typeof transaction.amount, 'Value:', transaction.amount);
  console.log('🏗️ Description type:', typeof transaction.description, 'Value:', transaction.description);
  
  return transaction;
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
      cleaned = `-${  cleaned.slice(1, -1)}`;
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