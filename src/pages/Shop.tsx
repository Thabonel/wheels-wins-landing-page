
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useShoppingBehavior } from '@/hooks/use-shopping-behavior';
import { useShoppingAnalytics } from '@/hooks/use-shopping-analytics';
import { adaptiveShopEngine } from '@/lib/adaptiveShopEngine';
import ProductGrid from '@/components/shop/ProductGrid';
import ShopFilters from '@/components/shop/ShopFilters';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, TrendingUp, Users } from 'lucide-react';
import { ShopProduct, DigitalProduct, AffiliateProduct, isDigitalProduct } from '@/components/shop/types';

const mockProducts: ShopProduct[] = [
  {
    id: '1',
    title: 'Smart Watch Pro',
    description: 'Advanced fitness tracking smartwatch',
    price: 299.99,
    currency: 'USD',
    type: 'smartwatch',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    availableRegions: ['US', 'AU', 'UK']
  } as DigitalProduct,
  {
    id: '2',
    title: 'Wireless Headphones',
    description: 'Premium noise-canceling headphones',
    externalLink: 'https://example.com/headphones',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    availableRegions: ['US', 'AU', 'UK'],
    isPamRecommended: true
  } as AffiliateProduct
];

const Shop = () => {
  const { user } = useAuth();
  const behaviorHook = useShoppingBehavior();
  const analytics = useShoppingAnalytics();
  const [products, setProducts] = useState<ShopProduct[]>(mockProducts);
  const [filteredProducts, setFilteredProducts] = useState<ShopProduct[]>(mockProducts);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState('featured');
  const [region, setRegion] = useState('US');
  const [isLearning, setIsLearning] = useState(true);

  // Initialize adaptive learning
  useEffect(() => {
    if (user && isLearning) {
      adaptiveShopEngine.setAnalytics(analytics);
      adaptiveShopEngine.initializeBehaviorTracking(user.id, behaviorHook);
      analytics.startShoppingSession();
    }

    return () => {
      if (analytics.isTracking) {
        analytics.endShoppingSession();
      }
    };
  }, [user, analytics, behaviorHook, isLearning]);

  // Apply adaptive learning to products
  useEffect(() => {
    const applyAdaptiveLearning = async () => {
      if (!isLearning) {
        setFilteredProducts(products);
        return;
      }

      try {
        // Apply filters first
        let filtered = products.filter((product) => {
          const matchesCategory = selectedCategory === 'all' || 
            (selectedCategory === 'digital' && isDigitalProduct(product)) ||
            (selectedCategory === 'affiliate' && !isDigitalProduct(product));
          
          let matchesPrice = true;
          if (isDigitalProduct(product)) {
            matchesPrice = product.price >= priceRange[0] && product.price <= priceRange[1];
          }
          
          return matchesCategory && matchesPrice;
        });

        // Apply adaptive learning
        const userPreferences = {
          categories: {
            digital: 0.8,
            general: 0.5
          }
        };

        const adaptedProducts = await adaptiveShopEngine.adaptInventory(filtered, userPreferences);

        // Apply sorting
        if (sortBy === 'price-low') {
          adaptedProducts.sort((a, b) => {
            const priceA = isDigitalProduct(a) ? a.price : 0;
            const priceB = isDigitalProduct(b) ? b.price : 0;
            return priceA - priceB;
          });
        } else if (sortBy === 'price-high') {
          adaptedProducts.sort((a, b) => {
            const priceA = isDigitalProduct(a) ? a.price : 0;
            const priceB = isDigitalProduct(b) ? b.price : 0;
            return priceB - priceA;
          });
        }

        setFilteredProducts(adaptedProducts);
      } catch (error) {
        console.error('Error applying adaptive learning:', error);
        setFilteredProducts(products);
      }
    };

    applyAdaptiveLearning();
  }, [products, selectedCategory, priceRange, sortBy, isLearning]);

  const handleProductView = async (productId: string) => {
    if (isLearning && user) {
      await adaptiveShopEngine.trackProductView(productId, behaviorHook);
      await analytics.trackProductInteraction({
        productId,
        interactionType: 'view',
        durationSeconds: 5
      });
    }
  };

  const handleExternalLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleBuyProduct = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product && isLearning) {
      await adaptiveShopEngine.trackPurchase(productId, behaviorHook);
      
      const contextData: any = {};
      if (isDigitalProduct(product)) {
        contextData.price = product.price;
      }
      
      await analytics.trackProductInteraction({
        productId,
        interactionType: 'purchase',
        contextData
      });
    }
    // Handle actual purchase logic here
    console.log('Purchase initiated for product:', productId);
  };

  const toggleLearning = () => {
    if (isLearning) {
      adaptiveShopEngine.disableLearning();
    } else {
      adaptiveShopEngine.enableLearning();
    }
    setIsLearning(!isLearning);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shop</h1>
            <p className="text-gray-600 mt-2">Discover amazing products tailored for you</p>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <Button
                onClick={toggleLearning}
                variant={isLearning ? "default" : "outline"}
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                {isLearning ? 'Learning On' : 'Learning Off'}
              </Button>
            </div>
          )}
        </div>

        {user && isLearning && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Adaptive Learning Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Personalizing recommendations</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Learning from behavior</span>
                </div>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Adapting inventory</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <ShopFilters
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
          </div>
          
          <div className="lg:col-span-3">
            <ProductGrid
              products={filteredProducts}
              region={region}
              onExternalLinkClick={handleExternalLinkClick}
              onBuyProduct={handleBuyProduct}
              onProductView={handleProductView}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Shop;
