import { supabase } from '@/integrations/supabase/client';

interface ParsedTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  originalData?: Record<string, any>;
}

export const parsePdfFile = async (file: File, sessionId: string): Promise<ParsedTransaction[]> => {
  // PDFs require server-side processing due to complexity
  // We'll upload the file securely and process it on the backend
  
  try {
    // Create a FormData object
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', sessionId);
    
    // Get the current user's token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('Authentication required');
    }
    
    // Send to backend for processing
    const response = await fetch('/api/bank-statements/parse-pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`PDF parsing failed: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    // Convert the result to our transaction format
    return result.transactions.map((t: any) => ({
      id: t.id || generateTransactionId(new Date(t.date), t.description, t.amount),
      date: new Date(t.date),
      description: t.description,
      amount: Math.abs(t.amount),
      type: t.type || (t.amount < 0 ? 'debit' : 'credit'),
      originalData: t,
    }));
  } catch (error) {
    console.error('PDF parsing error:', error);
    
    // Fallback to mock data for development
    if (process.env.NODE_ENV === 'development') {
      return generateMockTransactions();
    }
    
    throw error;
  }
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