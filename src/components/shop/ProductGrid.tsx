import { useMemo } from "react";
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
  // Deduplicate products by ID to prevent React key warnings
  // Backend may return duplicates in some cases
  const uniqueProducts = useMemo(() => {
    const seen = new Set<string>();
    return products.filter((product) => {
      if (seen.has(product.id)) {
        return false;
      }
      seen.add(product.id);
      return true;
    });
  }, [products]);

  const handleProductView = (productId: string) => {
    console.log('View product:', productId);
  };

  if (uniqueProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
        <p className="text-gray-600">Try adjusting your filters or check back later for new products.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {uniqueProducts.map((product) => (
        <div key={product.id} onClick={() => handleProductView(product.id)}>
          <ProductCard
            product={product}
            onExternalLinkClick={onExternalLinkClick}
            onBuyProduct={onBuyProduct}
          />
        </div>
      ))}
    </div>
  );
}
