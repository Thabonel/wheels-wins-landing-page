
import { Region, REGION_CONFIG } from "@/context/RegionContext";
import { AffiliateProduct, DigitalProduct } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { convertPrice } from "@/services/currencyService";

// Digital products function - queries affiliate_products table
// Note: The category column is an enum type, so we use 'in' filter with valid enum values
// Digital-like categories: 'books_manuals', 'electronics'
export async function getDigitalProductsFromDB(region: Region): Promise<DigitalProduct[]> {
  try {
    // Query affiliate_products table for digital-like categories
    // Using 'in' filter since category is an enum type (not text - ILIKE won't work)
    const { data, error } = await supabase
      .from('affiliate_products')
      .select('*')
      .eq('is_active', true)
      .in('category', ['books_manuals', 'electronics'])
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching digital products from database:', error);
      return [];
    }

    console.log(`Shop: Loaded ${data?.length || 0} digital products from database`);

    return (data || []).map(product => {
      const audPrice = product.price || 0;
      const convertedPrice = convertPrice(audPrice, region);
      const availableRegions = getAvailableRegions(product.regional_asins);

      return {
        id: product.id,
        title: product.title || product.name || 'Unknown Product',
        description: product.description || '',
        image: product.image_url || "/placeholder-product.jpg",
        price: convertedPrice.amount,
        currency: convertedPrice.currency,
        type: product.category || "software",
        availableRegions: availableRegions,
        isNew: false,
        hasBonus: false
      };
    }).filter(product =>
      product.availableRegions.includes(region) || product.availableRegions.length === 0
    );
  } catch (error) {
    console.error('Unexpected error fetching digital products:', error);
    return [];
  }
}

/**
 * Get regional affiliate URL based on user's region
 * Falls back to default affiliate_url if no regional URL available
 */
function getRegionalUrl(
  product: any,
  userRegion: Region
): string {
  const countryCode = REGION_CONFIG[userRegion]?.country;

  // Check if product has regional URLs
  if (product.regional_urls && typeof product.regional_urls === 'object') {
    const regionalUrl = product.regional_urls[countryCode];
    if (regionalUrl) {
      return regionalUrl;
    }
  }

  // Fallback to default affiliate URL
  return product.affiliate_url || "#";
}

/**
 * Get regional price based on user's region
 * Falls back to default price if no regional price available
 *
 * Regional prices structure: {"AU":{"amount":169.83,"currency":"AUD"},"US":{"amount":79.99,"currency":"USD"}}
 */
function getRegionalPrice(
  product: any,
  userRegion: Region
): { price: number; currency: string } | null {
  const countryCode = REGION_CONFIG[userRegion]?.country;
  const regionConfig = REGION_CONFIG[userRegion];

  // Check if product has regional prices with nested amount/currency structure
  if (product.regional_prices && typeof product.regional_prices === 'object') {
    const regionalPriceData = product.regional_prices[countryCode];
    if (regionalPriceData && typeof regionalPriceData === 'object' && regionalPriceData.amount !== undefined) {
      return {
        price: Number(regionalPriceData.amount),
        currency: regionalPriceData.currency || regionConfig?.currency || 'USD'
      };
    }
  }

  // Fallback to base price with currency conversion
  if (product.price !== null && product.price !== undefined) {
    const convertedPrice = convertPrice(Number(product.price), userRegion);
    return {
      price: convertedPrice.amount,
      currency: convertedPrice.currency
    };
  }

  return null;
}

/**
 * Determine available regions based on regional_asins
 */
function getAvailableRegions(regionalAsins: any): Region[] {
  if (!regionalAsins || typeof regionalAsins !== 'object') {
    return ['Rest of the World'];
  }

  const regions: Region[] = [];
  const countryToRegion: Record<string, Region> = {
    'AU': 'Australia',
    'NZ': 'New Zealand',
    'US': 'United States',
    'CA': 'Canada',
    'GB': 'United Kingdom'
  };

  Object.keys(regionalAsins).forEach(countryCode => {
    const region = countryToRegion[countryCode];
    if (region) {
      regions.push(region);
    }
  });

  return regions.length > 0 ? regions : ['Rest of the World'];
}

export async function getAffiliateProductsFromDB(userRegion?: Region): Promise<AffiliateProduct[]> {
  try {
    const { data, error } = await supabase
      .from('affiliate_products')
      .select('*')
      .eq('affiliate_provider', 'amazon')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching affiliate products from database:', error);
      return [];
    }

    console.log(`Shop: Loaded ${data?.length || 0} affiliate products from database`);


    return (data || []).map(product => {
      const externalLink = userRegion
        ? getRegionalUrl(product, userRegion)
        : product.affiliate_url;

      // Get regional price if region is provided, otherwise use base price
      let priceInfo: { price: number; currency: string } | null = null;
      if (userRegion) {
        priceInfo = getRegionalPrice(product, userRegion);
      } else if (product.price !== null && product.price !== undefined) {
        // No region provided - use base price with default currency
        priceInfo = {
          price: Number(product.price),
          currency: product.currency || 'USD'
        };
      }

      // Build base product object
      const affiliateProduct: AffiliateProduct = {
        id: product.id,
        title: product.title,
        description: product.description || '',
        image: product.image_url || "/placeholder-product.jpg",
        externalLink: externalLink,
        availableRegions: getAvailableRegions(product.regional_asins),
        isPamRecommended: product.is_featured || false,
        categories: product.tags || [],
        brand: product.category
      };

      // Only add price/currency if we have valid price data
      if (priceInfo && priceInfo.price !== undefined && priceInfo.price !== null) {
        affiliateProduct.price = priceInfo.price;
        affiliateProduct.currency = priceInfo.currency;
      }

      return affiliateProduct;
    });
  } catch (error) {
    console.error('Unexpected error fetching affiliate products:', error);
    return [];
  }
}

// Digital products - query database only, no fallback
export async function getDigitalProducts(region: Region): Promise<DigitalProduct[]> {
  const dbProducts = await getDigitalProductsFromDB(region);

  if (dbProducts.length === 0) {
    console.log('Shop: No digital products in database');
  }

  return dbProducts;
}

// Affiliate products - query database only, no fallback
export async function getAffiliateProducts(region?: Region): Promise<AffiliateProduct[]> {
  const dbProducts = await getAffiliateProductsFromDB(region);

  if (dbProducts.length === 0) {
    console.warn('Shop: No affiliate products found in database');
    // Return empty array; UI will show no products without throwing
    return [];
  }

  return dbProducts;
}
