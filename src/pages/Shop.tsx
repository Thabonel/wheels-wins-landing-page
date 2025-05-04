
import { useState } from "react";
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs";
import { useRegion } from "@/context/RegionContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { TabValue, ShopProduct } from "@/components/shop/types";
import FeaturedCarousel from "@/components/shop/FeaturedCarousel";
import ProductFilters from "@/components/shop/ProductFilters";
import ProductGrid from "@/components/shop/ProductGrid";
import PamAssistantWrapper from "@/components/shop/PamAssistantWrapper";
import { getAffiliateProducts, getDigitalProducts } from "@/components/shop/ProductsData";

export default function Shop() {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const isMobile = useIsMobile();
  const { region } = useRegion();
  
  // Mock user data for Pam assistant
  const user = {
    name: "John",
    avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png"
  };
  
  // Filter products based on current region
  const regionFilteredAffiliateProducts = getAffiliateProducts().filter(
    product => product.availableRegions.includes(region)
  );
  
  const regionFilteredDigitalProducts = getDigitalProducts(region).filter(
    product => product.availableRegions.includes(region)
  );
  
  // Combine products for "All" tab
  const allProducts = [...regionFilteredDigitalProducts, ...regionFilteredAffiliateProducts];
  
  // Filter products based on active tab
  const getFilteredProducts = (): ShopProduct[] => {
    switch(activeTab) {
      case "affiliate":
        return regionFilteredAffiliateProducts;
      case "digital":
        return regionFilteredDigitalProducts;
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
    // In a real implementation, this would initiate the checkout process
    console.log(`Initiating checkout for product: ${productId}`);
    alert("Checkout functionality would be integrated with Stripe in a real implementation.");
  };
  
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - 75% on desktop */}
        <div className="w-full lg:w-3/4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Wheels & Wins Shop</h1>
            <p className="text-gray-600">
              Curated products and resources for mature travelers in {region}
            </p>
          </div>
          
          {/* Featured Products Carousel */}
          <FeaturedCarousel products={allProducts} region={region} />
          
          {/* Main Product Tabs */}
          <Tabs 
            defaultValue="all" 
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as TabValue)}
            className="w-full"
          >
            <TabsList className="w-full justify-start overflow-x-auto mb-6">
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
        
        {/* Pam Assistant - 25% on desktop, floating button on mobile */}
        <div className={`${isMobile ? 'fixed bottom-4 right-4 z-30' : 'w-full lg:w-1/4'}`}>
          <PamAssistantWrapper user={user} />
        </div>
      </div>
    </div>
  );
}
