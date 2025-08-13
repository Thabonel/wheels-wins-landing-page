// Using Web Crypto API instead of crypto-js for better compatibility

interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  merchantName?: string;
  originalData?: Record<string, any>;
}

interface AnonymizedResult {
  transactions: Transaction[];
  redactedFields: string[];
}

// Patterns for sensitive data detection
const SENSITIVE_PATTERNS = {
  // Account numbers (various formats)
  accountNumber: [
    /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,  // Credit card format
    /\b\d{8,12}\b/g,  // Bank account numbers
    /\bAC[\s:]?\d{8,}\b/gi,  // Account number with prefix
    /\baccount[\s:]?\d{8,}\b/gi,  // Account with word
  ],
  
  // Social Security Numbers
  ssn: [
    /\b\d{3}-\d{2}-\d{4}\b/g,
    /\b\d{3}\s\d{2}\s\d{4}\b/g,
    /\b\d{9}\b/g,  // 9 consecutive digits might be SSN
  ],
  
  // Phone numbers
  phone: [
    /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    /\b\(\d{3}\)\s?\d{3}[-.\s]?\d{4}\b/g,
    /\b\+\d{1,3}\s?\d{3,14}\b/g,  // International format
  ],
  
  // Email addresses
  email: [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  ],
  
  // Physical addresses
  address: [
    /\d+\s+[A-Za-z\s]+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Plaza|Pl|Way|Parkway|Pkwy)\b/gi,
    /\b(Apt|Suite|Unit|#)\s*\d+\b/gi,
    /\b\d{5}(-\d{4})?\b/g,  // ZIP codes
  ],
  
  // Names (common patterns, not exhaustive)
  personalName: [
    /\b(Mr\.|Mrs\.|Ms\.|Dr\.|Prof\.)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/g,
    /\b[A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+\b/g,  // First M. Last
  ],
  
  // Routing numbers
  routingNumber: [
    /\b\d{9}\b/g,  // 9-digit routing numbers
    /\brouting[\s:]?\d{9}\b/gi,
    /\bABA[\s:]?\d{9}\b/gi,
  ],
};

export const anonymizeTransactions = async (
  transactions: Transaction[]
): Promise<AnonymizedResult> => {
  const redactedFields = new Set<string>();
  const anonymized: Transaction[] = [];
  
  for (const transaction of transactions) {
    const cleaned = await anonymizeTransaction(transaction, redactedFields);
    anonymized.push(cleaned);
  }
  
  return {
    transactions: anonymized,
    redactedFields: Array.from(redactedFields),
  };
};

const anonymizeTransaction = async (
  transaction: Transaction,
  redactedFields: Set<string>
): Promise<Transaction> => {
  const cleaned = { ...transaction };
  
  // Anonymize description
  const descResult = anonymizeText(transaction.description);
  cleaned.description = descResult.text;
  descResult.redacted.forEach(field => redactedFields.add(field));
  
  // Extract and clean merchant name
  cleaned.merchantName = extractMerchantName(cleaned.description);
  
  // Check for recurring patterns
  cleaned.isRecurring = detectRecurringTransaction(cleaned.description);
  
  // Generate hash signature for duplicate detection
  cleaned.hash_signature = generateTransactionHash(transaction);
  
  // Add redacted fields to transaction
  cleaned.redactedFields = descResult.redacted;
  
  // Remove original data to prevent leakage
  delete cleaned.originalData;
  
  return cleaned;
};

const anonymizeText = (text: string): { text: string; redacted: string[] } => {
  let anonymized = text;
  const redacted: string[] = [];
  
  // Check and redact each pattern type
  for (const [type, patterns] of Object.entries(SENSITIVE_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = anonymized.match(pattern);
      if (matches && matches.length > 0) {
        redacted.push(type);
        
        // Apply specific redaction based on type
        if (type === 'accountNumber') {
          // Show only last 4 digits with proper masking
          anonymized = anonymized.replace(pattern, (match) => {
            const digits = match.replace(/\D/g, '');
            const separators = match.replace(/\d/g, ''); // Keep separators like spaces/dashes
            
            if (digits.length >= 4) {
              const lastFour = digits.slice(-4);
              const maskLength = Math.max(4, digits.length - 4); // At least 4 asterisks
              
              // Reconstruct with proper formatting
              if (separators.length > 0) {
                // Preserve original formatting pattern
                return '****' + separators.slice(-1) + lastFour;
              } else {
                return '*'.repeat(maskLength) + lastFour;
              }
            }
            // If less than 4 digits, mask completely
            return '*'.repeat(Math.max(match.length, 8));
          });
        } else if (type === 'email') {
          anonymized = anonymized.replace(pattern, '[email]');
        } else if (type === 'phone') {
          anonymized = anonymized.replace(pattern, (match) => {
            const digits = match.replace(/\D/g, '');
            if (digits.length >= 4) {
              return 'XXX-XXX-' + digits.slice(-4);
            }
            return '[phone]';
          });
        } else if (type === 'ssn') {
          anonymized = anonymized.replace(pattern, 'XXX-XX-####');
        } else if (type === 'address') {
          anonymized = anonymized.replace(pattern, '[address]');
        } else if (type === 'personalName') {
          anonymized = anonymized.replace(pattern, '[name]');
        } else {
          // Generic redaction
          anonymized = anonymized.replace(pattern, (match) => 
            '*'.repeat(Math.min(match.length, 8))
          );
        }
      }
    }
  }
  
  // Remove any remaining long alphanumeric sequences (potential reference numbers)
  anonymized = anonymized.replace(/\b[A-Z0-9]{20,}\b/g, '[reference]');
  
  return {
    text: anonymized.trim(),
    redacted: [...new Set(redacted)],
  };
};

const extractMerchantName = (description: string): string => {
  // Remove common transaction prefixes
  let merchant = description
    .replace(/^(POS|ATM|DEBIT|CREDIT|PURCHASE|PAYMENT|TRANSFER|WITHDRAWAL|DEPOSIT)\s+/i, '')
    .replace(/^(FROM|TO|AT)\s+/i, '');
  
  // Extract merchant from common patterns
  const patterns = [
    /^([A-Z][A-Z0-9\s&\-\.]+)(?:\s+\d+|\s+[A-Z]{2,3})?$/,  // MERCHANT NAME + location
    /^([^\d]+?)(?:\s+\d{2}\/\d{2}|\s+\#\d+)?$/,  // Merchant before date or number
    /^([^*]+?)(?:\s*\*+\d+)?$/,  // Merchant before masked number
  ];
  
  for (const pattern of patterns) {
    const match = merchant.match(pattern);
    if (match) {
      merchant = match[1].trim();
      break;
    }
  }
  
  // Clean up the merchant name
  merchant = merchant
    .replace(/\s+/g, ' ')
    .replace(/[*#]+\d{4}$/, '')  // Remove trailing card numbers
    .replace(/\s+(LLC|INC|CORP|LTD|CO)\.?$/i, '')  // Remove company suffixes
    .trim();
  
  // Capitalize properly
  merchant = merchant
    .split(' ')
    .map(word => {
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word;  // Keep acronyms
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
  
  return merchant || 'Unknown Merchant';
};

const detectRecurringTransaction = (description: string): boolean => {
  const recurringKeywords = [
    'subscription',
    'recurring',
    'monthly',
    'annual',
    'membership',
    'premium',
    'netflix',
    'spotify',
    'amazon prime',
    'insurance',
    'mortgage',
    'rent',
    'utilities',
    'phone bill',
    'internet bill',
    'gym',
    'storage',
  ];
  
  const lowerDesc = description.toLowerCase();
  return recurringKeywords.some(keyword => lowerDesc.includes(keyword));
};

const generateTransactionHash = (transaction: Transaction): string => {
  // Create a unique hash for duplicate detection
  const hashInput = [
    transaction.date.toISOString().split('T')[0],
    Math.round(transaction.amount * 100),
    transaction.type,
    transaction.description.substring(0, 20),
  ].join('|');
  
  // Use a simple hash function since we don't need cryptographic security
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).substring(0, 16);
};

// Client-side encryption for sensitive data before any transmission
export const encryptSensitiveData = async (data: any, key: string): Promise<string> => {
  // Use Web Crypto API for encryption
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key.padEnd(32, '0').substring(0, 32)); // Ensure 32-byte key
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dataBuffer = encoder.encode(JSON.stringify(data));
  
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    dataBuffer
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...combined));
};

// Decrypt data if needed
export const decryptSensitiveData = async (encryptedData: string, key: string): Promise<any> => {
  const decoder = new TextDecoder();
  const keyData = new TextEncoder().encode(key.padEnd(32, '0').substring(0, 32));
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  return JSON.parse(decoder.decode(decrypted));
};

// Generate a secure session key
export const generateSessionKey = (): string => {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
};