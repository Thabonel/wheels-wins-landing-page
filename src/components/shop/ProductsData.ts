import { Region } from "@/context/RegionContext";
import { AffiliateProduct, DigitalProduct } from "./types";
import { supabase } from "@/integrations/supabase/client";

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
    return (data || []).map(product => ({
      id: product.id,
      title: product.name,
      description: product.description,
      image: product.image_url || "/placeholder-product.jpg",
      price: product.price || 0,
      currency: "USD",
      type: product.category || "software",
      availableRegions: product.available_regions || [],
      isNew: false,
      hasBonus: false
    })).filter(product => 
      product.availableRegions.includes(region) || product.availableRegions.length === 0
    );
  } catch (error) {
    console.error('Unexpected error fetching digital products:', error);
    return [];
  }
}

export async function getAffiliateProductsFromDB(): Promise<AffiliateProduct[]> {
  try {
    const { data, error } = await supabase
      .from('v_shop_products')  // Using the view
      .select('*')
      .eq('type', 'affiliate')
      .eq('status', 'active');

    if (error) {
      console.error('Error fetching affiliate products from database:', error);
      return [];
    }

    console.log('Shop: Using database affiliate products data');
    return (data || []).map(product => ({
      id: product.id,
      title: product.name,
      description: product.description,
      image: product.image_url || "/placeholder-product.jpg",
      externalLink: product.external_url || "#",
      availableRegions: product.available_regions || [],
      isPamRecommended: false
    }));
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
  return [
    {
      id: "trip-planner-pro",
      title: "Advanced Trip Planner Pro",
      description: "Premium trip planning tools with offline maps, weather integration, and route optimization for RV travelers.",
      image: "/placeholder-product.jpg",
      price: 29.99,
      currency: "USD",
      type: "software",
      availableRegions: ["US", "Canada", "Australia"],
      isNew: true
    },
    {
      id: "budget-tracker",
      title: "RV Budget Tracker & Analytics",
      description: "Comprehensive financial tracking designed specifically for nomadic lifestyles with expense categorization.",
      image: "/placeholder-product.jpg",
      price: 19.99,
      currency: "USD",
      type: "software",
      availableRegions: ["US", "Canada", "Australia"]
    },
    {
      id: "maintenance-guide",
      title: "Complete RV Maintenance Guide",
      description: "Digital handbook covering all aspects of RV maintenance with step-by-step tutorials and checklists.",
      image: "/placeholder-product.jpg",
      price: 24.99,
      currency: "USD",
      type: "ebook",
      availableRegions: ["US", "Canada", "Australia"],
      hasBonus: true
    }
  ];
}

export async function getAffiliateProducts(): Promise<AffiliateProduct[]> {
  const dbProducts = await getAffiliateProductsFromDB();
  if (dbProducts.length > 0) {
    return dbProducts;
  }
  
  console.log('Shop: Using static affiliate products data');
  return [
    {
      id: "solar-panel-kit",
      title: "Renogy 400W Solar Panel Kit",
      description: "Complete solar power solution for RVs with high-efficiency panels and charge controller.",
      image: "/placeholder-product.jpg",
      externalLink: "https://example.com/solar-kit",
      availableRegions: ["US", "Canada"],
      isPamRecommended: true
    },
    {
      id: "portable-generator",
      title: "Honda EU2200i Portable Generator",
      description: "Quiet, fuel-efficient generator perfect for boondocking and emergency power needs.",
      image: "/placeholder-product.jpg",
      externalLink: "https://example.com/generator",
      availableRegions: ["US", "Canada", "Australia"]
    },
    {
      id: "water-filter",
      title: "Berkey Water Filter System",
      description: "Reliable water filtration for safe drinking water anywhere your travels take you.",
      image: "/placeholder-product.jpg",
      externalLink: "https://example.com/water-filter",
      availableRegions: ["US", "Canada", "Australia"],
      isPamRecommended: true
    }
  ];
}
