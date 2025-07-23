import { RegionConfig, REGION_CONFIG } from '@/context/RegionContext';

// Exchange rates relative to USD (base currency)
// In production, this should be fetched from a real API like exchangerate-api.com
const EXCHANGE_RATES: Record<string, number> = {
  'USD': 1.0,      // Base currency
  'AUD': 1.57,     // Australian Dollar  
  'NZD': 1.67,     // New Zealand Dollar
  'CAD': 1.43,     // Canadian Dollar
  'GBP': 0.79,     // British Pound
};

export interface ConvertedPrice {
  amount: number;
  currency: string;
  currencySymbol: string;
  formatted: string;
}

/**
 * Convert USD price to target region currency
 */
export function convertPrice(usdPrice: number, targetRegion: keyof typeof REGION_CONFIG): ConvertedPrice {
  const regionConfig = REGION_CONFIG[targetRegion];
  const exchangeRate = EXCHANGE_RATES[regionConfig.currency] || 1.0;
  
  const convertedAmount = usdPrice * exchangeRate;
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