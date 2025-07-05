
import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ShopProduct } from '@/components/shop/types';
import { getAffiliateProducts, getDigitalProducts } from '@/components/shop/ProductsData';

interface PersonalizedRecommendation {
  id: string;
  productId: string;
  recommendationType: 'general' | 'trending' | 'seasonal' | 'bundle' | 'pam_pick';
  confidenceScore: number;
  context: Record<string, any>;
}

export function usePersonalizedRecommendations() {
  const { user } = useAuth();
  const [personalizedProducts, setPersonalizedProducts] = useState<ShopProduct[]>([]);
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const generateRecommendations = useCallback(async () => {
    if (!user) {
      // Fallback to static products when not authenticated
      try {
        const [digitalProducts, affiliateProducts] = await Promise.all([
          getDigitalProducts('United States'),
          getAffiliateProducts()
        ]);
        const fallbackProducts = [...digitalProducts, ...affiliateProducts];
        setPersonalizedProducts(fallbackProducts.slice(0, 9));
        setRecommendations([]);
      } catch (error) {
        console.error('Error loading fallback products:', error);
        setPersonalizedProducts([]);
      }
      return;
    }

    setIsLoading(true);
    try {
      // Attempt to fetch recommendations from Supabase
      const { data: dbRecommendations, error } = await supabase.rpc(
        'get_personalized_recommendations',
        { p_user_id: user.id, p_limit: 9 }
      );

      if (error) {
        throw error;
      }

      if (dbRecommendations && dbRecommendations.length > 0) {
        const [digitalProducts, affiliateProducts] = await Promise.all([
          getDigitalProducts('United States'),
          getAffiliateProducts()
        ]);
        const productMap = new Map(
          [...digitalProducts, ...affiliateProducts].map(p => [p.id, p])
        );
        const matchedProducts = dbRecommendations
          .map(rec => productMap.get(rec.product_id))
          .filter(Boolean) as ShopProduct[];

        setPersonalizedProducts(matchedProducts);
        setRecommendations(
          dbRecommendations.map(rec => ({
            id: rec.id,
            productId: rec.product_id,
            recommendationType: rec.recommendation_type as any,
            confidenceScore: rec.confidence_score,
            context: (rec.context as any) || {}
          }))
        );
        return;
      }

      // If no recommendations were returned, fall back to static products
      const [digitalProducts, affiliateProducts] = await Promise.all([
        getDigitalProducts('United States'),
        getAffiliateProducts()
      ]);
      const allProducts = [...digitalProducts, ...affiliateProducts];
      setPersonalizedProducts(allProducts.slice(0, 9));
      setRecommendations([]);
    } catch (error) {
      console.error('Error fetching personalized recommendations:', error);
      try {
        const [digitalProducts, affiliateProducts] = await Promise.all([
          getDigitalProducts('United States'),
          getAffiliateProducts()
        ]);
        const allProducts = [...digitalProducts, ...affiliateProducts];
        setPersonalizedProducts(allProducts.slice(0, 9));
        setRecommendations([]);
      } catch (fallbackError) {
        console.error('Error loading fallback products:', fallbackError);
        setPersonalizedProducts([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  return {
    personalizedProducts,
    recommendations,
    isLoading,
    generateRecommendations
  };
}
