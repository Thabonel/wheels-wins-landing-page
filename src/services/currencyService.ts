import { RegionConfig, REGION_CONFIG } from '@/context/RegionContext';

// Exchange rates relative to AUD (base currency)
// In production, this should be fetched from a real API like exchangerate-api.com
const EXCHANGE_RATES: Record<string, number> = {
  'AUD': 1.0,      // Base currency (Australian Dollar)
  'USD': 0.637,    // US Dollar (1 AUD = 0.637 USD)
  'NZD': 1.064,    // New Zealand Dollar
  'CAD': 0.911,    // Canadian Dollar
  'GBP': 0.503,    // British Pound
};

export interface ConvertedPrice {
  amount: number;
  currency: string;
  currencySymbol: string;
  formatted: string;
}

/**
 * Convert AUD price to target region currency
 */
export function convertPrice(audPrice: number, targetRegion: keyof typeof REGION_CONFIG): ConvertedPrice {
  const regionConfig = REGION_CONFIG[targetRegion];
  const exchangeRate = EXCHANGE_RATES[regionConfig.currency] || 1.0;
  
  const convertedAmount = audPrice * exchangeRate;
  const roundedAmount = Math.round(convertedAmount * 100) / 100; // Round to 2 decimal places
  
  return {
    amount: roundedAmount,
    currency: regionConfig.currency,
    currencySymbol: regionConfig.currencySymbol,
    formatted: `${regionConfig.currencySymbol}${roundedAmount.toFixed(2)}`
  };
}

/**
 * Get current exchange rate for a currency
 */
export function getExchangeRate(currency: string): number {
  return EXCHANGE_RATES[currency] || 1.0;
}

/**
 * Update exchange rates (for future real-time API integration)
 */
export async function updateExchangeRates(): Promise<void> {
  try {
    // TODO: In production, fetch from real API
    // const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    // const data = await response.json();
    // Update EXCHANGE_RATES with data.rates
    console.log('Exchange rates would be updated from API in production');
  } catch (error) {
    console.warn('Failed to update exchange rates:', error);
  }
}

/**
 * Format price with correct regional currency
 */
export function formatPrice(price: number, regionConfig: RegionConfig): string {
  return `${regionConfig.currencySymbol}${price.toFixed(2)}`;
}