
import { ShopProduct } from "./types";
import ProductCard from "./ProductCard";

interface TravelProductGridProps {
  products: ShopProduct[];
  region: string;
  onExternalLinkClick: (url: string) => void;
  onBuyProduct: (productId: string) => Promise<void>;
}

export default function TravelProductGrid({ 
  products, 
  region, 
  onExternalLinkClick, 
  onBuyProduct 
}: TravelProductGridProps) {
  const handleProductView = (productId: string) => {
    console.log('View product:', productId);
    // Handle product view tracking here
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
        <p className="text-gray-600">Try adjusting your filters or check back later for new products.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
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
