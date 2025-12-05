
import { Region } from "@/context/RegionContext";

export interface BaseProduct {
  id: string;
  title: string;
  description: string;
  image: string;
  availableRegions: Region[];
  categories?: string[];
  brand?: string;
  features?: string[];
  // Digistore24 fields
  digistore24_product_id?: string;
  digistore24_vendor_id?: string;
  commission_percentage?: number;
  vendor_rating?: number;
  auto_approved?: boolean;
  target_audience?: string[];
}

export interface AffiliateProduct extends BaseProduct {
  externalLink: string;
  isPamRecommended?: boolean;
  price?: number;
  currency?: string;
}

export interface DigitalProduct extends BaseProduct {
  price: number;
  currency: string;
  type: string;
  hasBonus?: boolean;
  isNew?: boolean;
}

export type TabValue = "all" | "digital" | "affiliate";

export type ShopProduct = AffiliateProduct | DigitalProduct;

export const isDigitalProduct = (product: ShopProduct): product is DigitalProduct => {
  // Digital products have 'type' field and NO externalLink
  return 'type' in product && !('externalLink' in product);
};

export const isAffiliateProduct = (product: ShopProduct): product is AffiliateProduct => {
  // Affiliate products have externalLink
  return 'externalLink' in product;
};
