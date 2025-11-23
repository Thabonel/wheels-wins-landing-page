
import { Region, REGION_CONFIG } from "@/context/RegionContext";
import { AffiliateProduct, DigitalProduct } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { convertPrice } from "@/services/currencyService";

// New database functions
export async function getDigitalProductsFromDB(region: Region): Promise<DigitalProduct[]> {
  try {
    const { data, error } = await supabase
      .from('v_shop_products')  // Using the view
      .select('*')
      .eq('type', 'digital')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching digital products from database:', error);
      return [];
    }

    console.log('Shop: Using database digital products data');
    return (data || []).map(product => {
      const audPrice = product.price || 0;
      const convertedPrice = convertPrice(audPrice, region);
      
      return {
        id: product.id,
        title: product.name,
        description: product.description,
        image: product.image_url || "/placeholder-product.jpg",
        price: convertedPrice.amount,
        currency: convertedPrice.currency,
        type: product.category || "software",
        availableRegions: (product.available_regions || []) as Region[],
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

      return {
        id: product.id,
        title: product.title,
        description: product.description || '',
        image: product.image_url || "/placeholder-product.jpg",
        externalLink: externalLink,
        availableRegions: getAvailableRegions(product.regional_asins),
        isPamRecommended: product.is_featured || false,
        categories: product.tags || [],
        brand: product.category // Using category as brand for now
      };
    });
  } catch (error) {
    console.error('Unexpected error fetching affiliate products:', error);
    return [];
  }
}

// Updated existing functions to try database first
export async function getDigitalProducts(region: Region): Promise<DigitalProduct[]> {
  const dbProducts = await getDigitalProductsFromDB(region);
  if (dbProducts.length > 0) {
    return dbProducts;
  }
  
  console.log('Shop: Using static digital products data');
  
  const staticProducts = [
    {
      id: "trip-planner-pro",
      title: "Advanced Trip Planner Pro",
      description: "Premium trip planning tools with offline maps, weather integration, and route optimization for RV travelers.",
      image: "/placeholder-product.jpg",
      basePrice: 47.00, // AUD base price
      type: "software",
      availableRegions: ["United States", "Canada", "Australia"] as Region[],
      isNew: true
    },
    {
      id: "budget-tracker",
      title: "RV Budget Tracker & Analytics",
      description: "Comprehensive financial tracking designed specifically for nomadic lifestyles with expense categorization.",
      image: "/placeholder-product.jpg",
      basePrice: 31.00, // AUD base price
      type: "software",
      availableRegions: ["United States", "Canada", "Australia"] as Region[]
    },
    {
      id: "maintenance-guide",
      title: "Complete RV Maintenance Guide",
      description: "Digital handbook covering all aspects of RV maintenance with step-by-step tutorials and checklists.",
      image: "/placeholder-product.jpg",
      basePrice: 39.00, // AUD base price
      type: "ebook",
      availableRegions: ["United States", "Canada", "Australia"] as Region[],
      hasBonus: true
    }
  ];

  // Convert prices to user's regional currency
  return staticProducts.map(product => {
    const convertedPrice = convertPrice(product.basePrice, region);
    
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      image: product.image,
      price: convertedPrice.amount,
      currency: convertedPrice.currency,
      type: product.type,
      availableRegions: product.availableRegions,
      isNew: product.isNew,
      hasBonus: product.hasBonus
    };
  });
}

export async function getAffiliateProducts(region?: Region): Promise<AffiliateProduct[]> {
  const dbProducts = await getAffiliateProductsFromDB(region);
  if (dbProducts.length > 0) {
    return dbProducts;
  }

  console.log('Shop: No affiliate products found in database, using static fallback');
  return [
    {
      id: "solar-panel-kit",
      title: "Renogy 400W Solar Panel Kit",
      description: "Complete solar power solution for RVs with high-efficiency panels and charge controller.",
      image: "/placeholder-product.jpg",
      externalLink: "https://example.com/solar-kit",
      availableRegions: ["United States", "Canada"] as Region[],
      isPamRecommended: true
    },
    {
      id: "portable-generator",
      title: "Honda EU2200i Portable Generator",
      description: "Quiet, fuel-efficient generator perfect for boondocking and emergency power needs.",
      image: "/placeholder-product.jpg",
      externalLink: "https://example.com/generator",
      availableRegions: ["United States", "Canada", "Australia"] as Region[]
    },
    {
      id: "water-filter",
      title: "Berkey Water Filter System",
      description: "Reliable water filtration for safe drinking water anywhere your travels take you.",
      image: "/placeholder-product.jpg",
      externalLink: "https://example.com/water-filter",
      availableRegions: ["United States", "Canada", "Australia"] as Region[],
      isPamRecommended: true
    }
  ];
}
