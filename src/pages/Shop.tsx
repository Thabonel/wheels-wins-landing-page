
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ProductGrid from "@/components/shop/ProductGrid";
import ShopHeader from "@/components/shop/ShopHeader";
import { useRegion } from "@/context/RegionContext";
import { adaptiveShopEngine } from "@/lib/adaptiveShopEngine";
import TravelIntegratedShop from "@/components/shop/TravelIntegratedShop";
import { useUserSettings } from "@/hooks/useUserSettings";

const Shop = () => {
  const [activeTab, setActiveTab] = useState("all");
  const { region } = useRegion();
  const { settings } = useUserSettings();

  // Check if travel integration is enabled
  const isIntegrationEnabled = settings?.integration_preferences?.shop_travel_integration || false;

  return (
    <div className="container mx-auto p-6">
      <ShopHeader />
      
      {isIntegrationEnabled ? (
        <TravelIntegratedShop />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="all">All Products</TabsTrigger>
            <TabsTrigger value="digital">Digital</TabsTrigger>
            <TabsTrigger value="affiliate">Affiliate</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
            <ProductGrid filter="all" region={region} />
          </TabsContent>
          
          <TabsContent value="digital" className="mt-0">
            <ProductGrid filter="digital" region={region} />
          </TabsContent>
          
          <TabsContent value="affiliate" className="mt-0">
            <ProductGrid filter="affiliate" region={region} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Shop;
