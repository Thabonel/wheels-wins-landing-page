
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShopProduct } from "./types";
import ProductCard from "./ProductCard";
import { usePersonalizedRecommendations } from "@/hooks/usePersonalizedRecommendations";
import { useShoppingAnalytics } from "@/hooks/useShoppingAnalytics";
import { useEffect } from "react";

interface PamRecommendationsProps {
  onExternalLinkClick: (url: string) => void;
  onBuyProduct: (productId: string) => void;
}

export default function PamRecommendations({ onExternalLinkClick, onBuyProduct }: PamRecommendationsProps) {
  const { personalizedProducts, recommendations, isLoading, generateRecommendations } = usePersonalizedRecommendations();
  const { trackProductInteraction } = useShoppingAnalytics();

  useEffect(() => {
    if (recommendations.length === 0) {
      generateRecommendations();
    }
  }, [recommendations.length, generateRecommendations]);

  const handleProductClick = (product: ShopProduct) => {
    trackProductInteraction({
      productId: product.id,
      interactionType: 'click',
      contextData: { section: 'pam_recommendations' }
    });
  };

  const getRecommendationLabel = (type: string) => {
    switch (type) {
      case 'trending':
        return 'Trending';
      case 'seasonal':
        return 'Seasonal Pick';
      case 'pam_pick':
        return "Pam's Favorite";
      default:
        return 'Recommended';
    }
  };

  const pamPickProducts = personalizedProducts.slice(0, 3);
  const trendingProducts = personalizedProducts.slice(3, 6);

  if (isLoading) {
    return (
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Pam's Personalized Picks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
              <p className="text-gray-500 mt-2">Pam is curating your recommendations...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8 space-y-6">
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pam's Top Picks for You</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={generateRecommendations}
              className="text-purple-600 border-purple-300 hover:bg-purple-50"
            >
              Refresh
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Based on your travel style and recent activity
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pamPickProducts.map((product) => {
              const recommendation = recommendations.find(r => r.productId === product.id);
              return (
                <div key={product.id} className="relative" onClick={() => handleProductClick(product)}>
                  {recommendation && (
                    <Badge
                      className="absolute -top-2 -right-2 z-10 bg-purple-600 hover:bg-purple-700"
                    >
                      {getRecommendationLabel(recommendation.recommendationType)}
                    </Badge>
                  )}
                  <ProductCard
                    product={product}
                    onExternalLinkClick={onExternalLinkClick}
                    onBuyProduct={onBuyProduct}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {trendingProducts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trending with Travelers Like You</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {trendingProducts.map((product) => (
                <div key={product.id} onClick={() => handleProductClick(product)}>
                  <ProductCard
                    product={product}
                    onExternalLinkClick={onExternalLinkClick}
                    onBuyProduct={onBuyProduct}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
