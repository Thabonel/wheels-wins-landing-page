
import { ShopProduct } from "./types";
import ProductCard from "./ProductCard";
import { Region } from "@/context/RegionContext";

interface ProductGridProps {
  products: ShopProduct[];
  region: Region;
  onExternalLinkClick: (url: string) => void;
  onBuyProduct: (productId: string) => void;
}

export default function ProductGrid({ products, region, onExternalLinkClick, onBuyProduct }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="col-span-full py-12 text-center">
        <p className="text-lg text-gray-500">No products available in {region} for this category.</p>
        <p className="text-sm text-gray-400 mt-2">Check back later as we expand our offerings.</p>
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard 
          key={product.id}
          product={product} 
          onExternalLinkClick={onExternalLinkClick}
          onBuyProduct={onBuyProduct}
        />
      ))}
    </div>
  );
}
