
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
import { useShoppingBehavior } from "@/hooks/useShoppingBehavior";
import { getAffiliateProducts, getDigitalProducts } from "@/components/shop/ProductsData";
import { adaptiveShopEngine } from "@/lib/adaptiveShopEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Shop() {
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [allProducts, setAllProducts] = useState<ShopProduct[]>([]);
  const [adaptedProducts, setAdaptedProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [learningProgress, setLearningProgress] = useState(0);
  const isMobile = useIsMobile();
  const { region } = useRegion();
  const { personalizedProducts } = usePersonalizedRecommendations();
  const { startShoppingSession, endShoppingSession, trackProductInteraction } = useShoppingAnalytics();
  const behaviorHook = useShoppingBehavior();
  
  // Initialize adaptive shop engine
  useEffect(() => {
    adaptiveShopEngine
      .initializeBehaviorTracking(behaviorHook)
      .initializeAnalytics({ startShoppingSession, endShoppingSession, trackProductInteraction, currentSession: null, isTracking: false });
  }, [behaviorHook, startShoppingSession, endShoppingSession, trackProductInteraction]);
  
  // Start shopping session when component mounts
  useEffect(() => {
    startShoppingSession();
    
    // End session when component unmounts
    return () => {
      endShoppingSession();
    };
  }, [startShoppingSession, endShoppingSession]);

  // Load and adapt products
  useEffect(() => {
    const loadAndAdaptProducts = async () => {
      setLoading(true);
      try {
        const [digitalProducts, affiliateProducts] = await Promise.all([
          getDigitalProducts(region),
          getAffiliateProducts()
        ]);
        
        // Filter by region
        const filteredProducts = [...digitalProducts, ...affiliateProducts].filter(
          product => product.availableRegions.includes(region)
        );
        
        setAllProducts(filteredProducts);
        
        // Apply adaptive learning to products
        const adapted = await adaptiveShopEngine.adaptInventory(filteredProducts);
        setAdaptedProducts(adapted);
        
        // Calculate learning progress based on behavior data
        if (behaviorHook.behaviorData) {
          const totalViews = behaviorHook.behaviorData.productViews.length;
          const progress = Math.min((totalViews / 20) * 100, 100); // 20 views = 100% progress
          setLearningProgress(progress);
        }
        
      } catch (error) {
        console.error('Error loading shop products:', error);
        setAllProducts([]);
        setAdaptedProducts([]);
        toast.error('Failed to load shop products');
      } finally {
        setLoading(false);
      }
    };

    loadAndAdaptProducts();
  }, [region, behaviorHook.behaviorData]);

  // Use adapted products if available, otherwise fall back to personalized or loaded products
  const displayProducts = adaptedProducts.length > 0 
    ? adaptedProducts 
    : personalizedProducts.length > 0 
    ? personalizedProducts 
    : allProducts;
  
  // Filter products based on active tab
  const getFilteredProducts = (): ShopProduct[] => {
    switch(activeTab) {
      case "affiliate":
        return displayProducts.filter(product => 'externalLink' in product);
      case "digital":
        return displayProducts.filter(product => 'price' in product);
      default:
        return displayProducts;
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
    
    // Track with adaptive engine
    adaptiveShopEngine.trackProductView(productId, behaviorHook);
    
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
    
    // Track with adaptive engine
    adaptiveShopEngine.trackProductView(productId, behaviorHook);
  };
  
  if (loading) {
    return (
      <div className="container p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Brain className="w-8 h-8 animate-pulse mx-auto mb-2" />
            <div className="text-lg">Pam is learning your preferences...</div>
            <div className="text-sm text-gray-600 mt-1">Personalizing your shopping experience</div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container p-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - 75% on desktop */}
        <div className="w-full lg:w-3/4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Wheels & Wins Shop</h1>
            <p className="text-gray-600">
              AI-curated products and resources for mature travelers in {region}
            </p>
          </div>

          {/* Pam's Learning Progress */}
          {behaviorHook.behaviorData && (
            <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="w-5 h-5 text-blue-600" />
                  Pam's Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Understanding your preferences</span>
                    <span className="text-sm text-gray-600">{learningProgress.toFixed(0)}%</span>
                  </div>
                  <Progress value={learningProgress} className="h-2" />
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>Views: {behaviorHook.behaviorData.productViews.length}</span>
                    <span>Categories explored: {new Set(behaviorHook.behaviorData.productViews.map(v => v.category)).size}</span>
                    {learningProgress >= 50 && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="w-3 h-3 mr-1" />
                        Personalizing
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trending in Your Area */}
          {adaptedProducts.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                  Trending in {region}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {adaptedProducts.slice(0, 3).map((product) => (
                    <div key={product.id} className="border rounded-lg p-3 hover:shadow-md transition-shadow">
                      <img 
                        src={product.image} 
                        alt={product.title}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                      <h3 className="font-medium text-sm line-clamp-2">{product.title}</h3>
                      {(product as any).relevanceScore && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-xs">
                            {((product as any).relevanceScore * 100).toFixed(0)}% match
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Pam's Personalized Recommendations */}
          <PamRecommendations 
            onExternalLinkClick={handleExternalLinkClick}
            onBuyProduct={handleBuyProduct}
          />
          
          {/* Featured Products Carousel */}
          <FeaturedCarousel products={displayProducts.slice(0, 6)} region={region} />
          
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
                onProductView={handleProductView}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - User Insights */}
        <div className="w-full lg:w-1/4">
          {behaviorHook.behaviorData && (
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-lg">Your Shopping Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-2">Top Categories</h4>
                  {Object.entries(
                    behaviorHook.behaviorData.productViews.reduce((acc, view) => {
                      const category = view.category || 'Unknown';
                      acc[category] = (acc[category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  )
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 3)
                    .map(([category, count]) => (
                      <div key={category} className="flex justify-between text-sm">
                        <span>{category}</span>
                        <span>{count} views</span>
                      </div>
                    ))}
                </div>
                
                <div>
                  <h4 className="font-medium text-sm mb-2">Shopping Pattern</h4>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>Most active time: Evenings</div>
                    <div>Preferred price range: $20-$100</div>
                    <div>Browse vs Buy ratio: 4:1</div>
                  </div>
                </div>

                {learningProgress >= 75 && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-green-600" />
                      <span className="font-medium text-sm text-green-800">Pam knows you well!</span>
                    </div>
                    <p className="text-xs text-green-700">
                      Your recommendations are now highly personalized based on your preferences.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
