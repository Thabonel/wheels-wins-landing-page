import { parseDocument } from './documentParser';

interface ParsedTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  originalData?: Record<string, any>;
}

export const parsePdfFile = async (file: File, sessionId: string): Promise<ParsedTransaction[]> => {
  // Use the universal document parser which handles PDFs, images, and invoices
  return parseDocument(file, sessionId);
};

const generateTransactionId = (date: Date, description: string, amount: number): string => {
  const dateStr = date.toISOString().split('T')[0];
  const descHash = description.substring(0, 10).replace(/\W/g, '');
  const amountStr = Math.round(amount * 100).toString();
  const random = Math.random().toString(36).substring(7);
  
  return `${dateStr}-${descHash}-${amountStr}-${random}`;
};

// Mock transactions for development/testing
const generateMockTransactions = (): ParsedTransaction[] => {
  const merchants = [
    'Walmart Supercenter',
    'Shell Gas Station',
    'Amazon.com',
    'Netflix Subscription',
    'Whole Foods Market',
    'Target Store',
    'Starbucks Coffee',
    'Home Depot',
    'Uber Trip',
    'Electric Company',
  ];
  
  const transactions: ParsedTransaction[] = [];
  const today = new Date();
  
  for (let i = 0; i < 20; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));
    
    const amount = Math.round((Math.random() * 200 + 10) * 100) / 100;
    const isCredit = Math.random() > 0.85;
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    
    transactions.push({
      id: generateTransactionId(date, merchant, amount),
      date,
      description: merchant,
      amount,
      type: isCredit ? 'credit' : 'debit',
    });
  }
  
  return transactions.sort((a, b) => b.date.getTime() - a.date.getTime());
};