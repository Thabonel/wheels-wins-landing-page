
import { useEffect, useState } from "react";
import { ShopProduct } from "./types";
import ProductCard from "./ProductCard";
import { getDigitalProducts, getAffiliateProducts } from "./ProductsData";
import { Region } from "@/context/RegionContext";

interface ProductGridProps {
  filter: "all" | "digital" | "affiliate";
  region: Region;
}

export default function ProductGrid({ filter, region }: ProductGridProps) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        let allProducts: ShopProduct[] = [];
        
        if (filter === "all") {
          const [digital, affiliate] = await Promise.all([
            getDigitalProducts(region),
            getAffiliateProducts()
          ]);
          allProducts = [...digital, ...affiliate];
        } else if (filter === "digital") {
          allProducts = await getDigitalProducts(region);
        } else if (filter === "affiliate") {
          allProducts = await getAffiliateProducts();
        }
        
        setProducts(allProducts);
      } catch (error) {
        console.error("Error loading products:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [filter, region]);

  const handleExternalLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleBuyProduct = (productId: string) => {
    console.log('Buy product:', productId);
    // Handle purchase logic here
  };

  const handleProductView = (productId: string) => {
    console.log('View product:', productId);
    // Handle product view tracking here
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading products...</p>
      </div>
    );
  }

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
            onExternalLinkClick={handleExternalLinkClick}
            onBuyProduct={handleBuyProduct}
          />
        </div>
      ))}
    </div>
  );
}
