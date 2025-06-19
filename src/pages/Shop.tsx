
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { useRegion } from "@/context/RegionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TabValue, ShopProduct } from "@/components/shop/types";
import FeaturedCarousel from "@/components/shop/FeaturedCarousel";
import ProductFilters from "@/components/shop/ProductFilters";
import ProductGrid from "@/components/shop/ProductGrid";
import PamRecommendations from "@/components/shop/PamRecommendations";
import { usePersonalizedRecommendations } from "@/hooks/usePersonalizedRecommendations";
import { useShoppingAnalytics } from "@/hooks/useShoppingAnalytics";
import { getAffiliateProducts, getDigitalProducts } from "@/components/shop/ProductsData";

export default function Shop() {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const isMobile = useIsMobile();
  const { region } = useRegion();
  const { personalizedProducts } = usePersonalizedRecommendations();
  const { startShoppingSession, endShoppingSession, trackProductInteraction } = useShoppingAnalytics();
  
  // Start shopping session when component mounts
  useEffect(() => {
    startShoppingSession();
    
    // End session when component unmounts
    return () => {
      endShoppingSession();
    };
  }, [startShoppingSession, endShoppingSession]);

  // Use personalized products if available, otherwise fall back to static products
  const allProducts = personalizedProducts.length > 0 
    ? personalizedProducts 
    : [...getDigitalProducts(region), ...getAffiliateProducts()].filter(
        product => product.availableRegions.includes(region)
      );
  
  // Filter products based on active tab
  const getFilteredProducts = (): ShopProduct[] => {
    switch(activeTab) {
      case "affiliate":
        return allProducts.filter(product => 'externalLink' in product);
      case "digital":
        return allProducts.filter(product => 'price' in product);
      default:
        return allProducts;
    }
  };
  
  // Handle external link clicks for affiliate products
  const handleExternalLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
  // Handle digital product purchases
  const handleBuyProduct = (productId: string) => {
    trackProductInteraction({
      productId,
      interactionType: 'purchase',
      contextData: { section: 'main_grid' }
    });
    
    // In a real implementation, this would initiate the checkout process
    console.log(`Initiating checkout for product: ${productId}`);
    alert("Checkout functionality would be integrated with Stripe in a real implementation.");
  };

  // Track product views
  const handleProductView = (productId: string) => {
    trackProductInteraction({
      productId,
      interactionType: 'view',
      contextData: { section: 'main_grid' }
    });
  };
  
  return (
    <div className="container p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - 75% on desktop */}
        <div className="w-full lg:w-3/4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Wheels & Wins Shop</h1>
            <p className="text-gray-600">
              Curated products and resources for mature travelers in {region}
            </p>
          </div>
          
          {/* Pam's Personalized Recommendations */}
          <PamRecommendations 
            onExternalLinkClick={handleExternalLinkClick}
            onBuyProduct={handleBuyProduct}
          />
          
          {/* Featured Products Carousel */}
          <FeaturedCarousel products={allProducts.slice(0, 6)} region={region} />
          
          {/* Main Product Tabs */}
          <Tabs 
            defaultValue="all" 
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TabValue)}
            className="w-full"
          >
            <TabsList className="w-full justify-start flex-wrap mb-6">
              <ProductFilters 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                isMobile={isMobile} 
              />
            </TabsList>
            
            <TabsContent value={activeTab}>
              <ProductGrid 
                products={getFilteredProducts()}
                region={region}
                onExternalLinkClick={handleExternalLinkClick}
                onBuyProduct={handleBuyProduct}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
