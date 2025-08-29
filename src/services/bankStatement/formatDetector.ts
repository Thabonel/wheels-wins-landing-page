/**
 * Format detection utilities for bank statement CSV files
 */

export interface CSVFormat {
  delimiter: string;
  hasHeaders: boolean;
  dateFormat: string;
  dateColumn: number;
  amountColumn: number | null;
  debitColumn: number | null;
  creditColumn: number | null;
  descriptionColumn: number;
  encoding: string;
}

/**
 * Analyzes CSV content to detect format
 */
export function detectCSVFormat(content: string): CSVFormat {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('Not enough data to detect format');
  }
  
  // Detect delimiter
  const delimiter = detectDelimiter(lines[0]);
  
  // Parse first few lines
  const parsedLines = lines.slice(0, Math.min(5, lines.length))
    .map(line => parseCSVLine(line, delimiter));
  
  // Check if first row looks like headers
  const hasHeaders = looksLikeHeaders(parsedLines[0], parsedLines.slice(1));
  
  // Detect column positions
  const columns = detectColumnPositions(parsedLines, hasHeaders);
  
  // Detect date format
  const dateFormat = detectDateFormat(parsedLines, columns.dateColumn, hasHeaders);
  
  return {
    delimiter,
    hasHeaders,
    dateFormat,
    ...columns,
    encoding: 'UTF-8' // Could be enhanced to detect encoding
  };
}

function detectDelimiter(line: string): string {
  const delimiters = [',', ';', '\t', '|'];
  let maxCount = 0;
  let bestDelimiter = ',';
  
  for (const delimiter of delimiters) {
    const count = (line.match(new RegExp(`\\${delimiter}`, 'g')) || []).length;
    if (count > maxCount) {
      maxCount = count;
      bestDelimiter = delimiter;
    }
  }
  
  return bestDelimiter;
}

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;
  
  while (i < line.length) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i += 2;
      } else {
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
  
  result.push(current.trim());
  return result;
}

function looksLikeHeaders(firstRow: string[], dataRows: string[][]): boolean {
  // Headers typically:
  // 1. Don't contain numbers only
  // 2. Have different pattern than data rows
  // 3. Contain common header keywords
  
  const headerKeywords = [
    'date', 'amount', 'description', 'balance', 'debit', 'credit',
    'memo', 'transaction', 'payment', 'reference', 'type', 'status'
  ];
  
  let headerScore = 0;
  
  for (const cell of firstRow) {
    const lower = cell.toLowerCase();
    
    // Check for header keywords
    if (headerKeywords.some(keyword => lower.includes(keyword))) {
      headerScore += 2;
    }
    
    // Headers usually don't contain just numbers
    if (cell && !cell.match(/^[\d\.\,\-\$]+$/)) {
      headerScore += 1;
    }
  }
  
  // If more than half the cells look like headers, it's probably a header row
  return headerScore >= firstRow.length;
}

function detectColumnPositions(
  parsedLines: string[][], 
  hasHeaders: boolean
): {
  dateColumn: number;
  amountColumn: number | null;
  debitColumn: number | null;
  creditColumn: number | null;
  descriptionColumn: number;
} {
  const startRow = hasHeaders ? 1 : 0;
  const headers = hasHeaders ? parsedLines[0] : [];
  const dataRows = parsedLines.slice(startRow);
  
  let dateColumn = -1;
  let amountColumn = -1;
  let debitColumn = -1;
  let creditColumn = -1;
  let descriptionColumn = -1;
  
  // If we have headers, use them
  if (hasHeaders) {
    headers.forEach((header, index) => {
      const lower = header.toLowerCase();
      
      if (lower.includes('date') || lower.includes('posted')) {
        dateColumn = index;
      }
      if (lower.includes('amount') || lower.includes('value')) {
        amountColumn = index;
      }
      if (lower.includes('debit') || lower.includes('withdrawal')) {
        debitColumn = index;
      }
      if (lower.includes('credit') || lower.includes('deposit')) {
        creditColumn = index;
      }
      if (lower.includes('description') || lower.includes('memo') || lower.includes('details')) {
        descriptionColumn = index;
      }
    });
  }
  
  // Auto-detect based on content patterns
  if (dateColumn === -1 && dataRows.length > 0) {
    for (let i = 0; i < dataRows[0].length; i++) {
      if (dataRows.every(row => isDateLike(row[i]))) {
        dateColumn = i;
        break;
      }
    }
  }
  
  if (amountColumn === -1 && dataRows.length > 0) {
    for (let i = 0; i < dataRows[0].length; i++) {
      if (i !== dateColumn && dataRows.every(row => isAmountLike(row[i]))) {
        amountColumn = i;
        break;
      }
    }
  }
  
  // Description is usually the longest text field
  if (descriptionColumn === -1 && dataRows.length > 0) {
    let maxAvgLength = 0;
    for (let i = 0; i < dataRows[0].length; i++) {
      if (i !== dateColumn && i !== amountColumn) {
        const avgLength = dataRows.reduce((sum, row) => sum + (row[i]?.length || 0), 0) / dataRows.length;
        if (avgLength > maxAvgLength) {
          maxAvgLength = avgLength;
          descriptionColumn = i;
        }
      }
    }
  }
  
  return {
    dateColumn: Math.max(0, dateColumn),
    amountColumn: amountColumn >= 0 ? amountColumn : null,
    debitColumn: debitColumn >= 0 ? debitColumn : null,
    creditColumn: creditColumn >= 0 ? creditColumn : null,
    descriptionColumn: Math.max(0, descriptionColumn)
  };
}

function detectDateFormat(
  parsedLines: string[][], 
  dateColumn: number,
  hasHeaders: boolean
): string {
  const startRow = hasHeaders ? 1 : 0;
  const dateSamples = parsedLines
    .slice(startRow, startRow + 5)
    .map(row => row[dateColumn])
    .filter(Boolean);
  
  if (dateSamples.length === 0) {
    return 'unknown';
  }
  
  // Try to detect common date formats
  const formats = [
    { pattern: /^\d{4}-\d{2}-\d{2}$/, format: 'YYYY-MM-DD' },
    { pattern: /^\d{2}\/\d{2}\/\d{4}$/, format: 'MM/DD/YYYY' },
    { pattern: /^\d{2}-\d{2}-\d{4}$/, format: 'MM-DD-YYYY' },
    { pattern: /^\d{1,2}\/\d{1,2}\/\d{4}$/, format: 'M/D/YYYY' },
    { pattern: /^\d{4}\/\d{2}\/\d{2}$/, format: 'YYYY/MM/DD' },
  ];
  
  for (const { pattern, format } of formats) {
    if (dateSamples.every(date => pattern.test(date))) {
      return format;
    }
  }
  
  // Check for DD/MM/YYYY vs MM/DD/YYYY
  const sample = dateSamples[0];
  const parts = sample.split(/[\/\-]/);
  if (parts.length === 3) {
    const first = parseInt(parts[0]);
    const second = parseInt(parts[1]);
    
    if (first > 12 && first <= 31) {
      return 'DD/MM/YYYY';
    }
    if (second > 12 && second <= 31) {
      return 'MM/DD/YYYY';
    }
  }
  
  return 'unknown';
}

function isDateLike(value: string): boolean {
  if (!value) return false;
  return /\d{1,4}[\/-]\d{1,2}[\/-]\d{1,4}/.test(value);
}

function isAmountLike(value: string): boolean {
  if (!value) return false;
  // Remove currency symbols and check if it's a number
  const cleaned = value.replace(/[$£€¥,\s]/g, '');
  return /^-?\d+\.?\d*$/.test(cleaned);
}

/**
 * Provides a preview of parsed CSV data for user verification
 */
export function previewCSV(
  content: string, 
  format: CSVFormat, 
  rowCount: number = 5
): { headers: string[], rows: string[][] } {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const startRow = format.hasHeaders ? 1 : 0;
  const endRow = Math.min(startRow + rowCount, lines.length);
  
  const headers = format.hasHeaders 
    ? parseCSVLine(lines[0], format.delimiter)
    : [];
  
  const rows = lines
    .slice(startRow, endRow)
    .map(line => parseCSVLine(line, format.delimiter));
  
  return { headers, rows };
}