
import { Region } from "@/context/RegionContext";

export interface BaseProduct {
  id: string;
  title: string;
  description: string;
  image: string;
  availableRegions: Region[];
}

export interface AffiliateProduct extends BaseProduct {
  externalLink: string;
  isPamRecommended?: boolean;
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
  return 'price' in product;
};

export const isAffiliateProduct = (product: ShopProduct): product is AffiliateProduct => {
  return 'externalLink' in product;
};
