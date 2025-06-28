
import { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase';
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
      // Table doesn't exist yet, use fallback static data
      const dbRecommendations = null;
      const error = null;

      if (error) {
        console.warn('Database recommendations not available, using fallback:', error);
      }

      // Generate fallback recommendations
      const [digitalProducts, affiliateProducts] = await Promise.all([
        getDigitalProducts('United States'),
        getAffiliateProducts()
      ]);
      const allProducts = [...digitalProducts, ...affiliateProducts];
      const selectedProducts = allProducts.slice(0, 9);
      
      const fallbackRecommendations: PersonalizedRecommendation[] = selectedProducts.map((product, index) => ({
        id: `fallback-${product.id}`,
        productId: product.id,
        recommendationType: index < 3 ? 'pam_pick' : index < 6 ? 'trending' : 'general',
        confidenceScore: 0.8 - (index * 0.05),
        context: { fallback: true }
      }));

      setPersonalizedProducts(selectedProducts);
      setRecommendations(dbRecommendations?.length ? 
        dbRecommendations.map(rec => ({
          id: rec.id,
          productId: rec.product_id,
          recommendationType: rec.recommendation_type as any,
          confidenceScore: rec.confidence_score,
          context: rec.context || {}
        })) : fallbackRecommendations
      );
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Final fallback
      try {
        const [digitalProducts, affiliateProducts] = await Promise.all([
          getDigitalProducts('United States'),
          getAffiliateProducts()
        ]);
        const allProducts = [...digitalProducts, ...affiliateProducts];
        setPersonalizedProducts(allProducts.slice(0, 6));
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
