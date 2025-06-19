
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRegion } from '@/context/RegionContext';
import { supabase } from '@/integrations/supabase/client';
import { ShopProduct } from '@/components/shop/types';
import { getAffiliateProducts, getDigitalProducts } from '@/components/shop/ProductsData';

interface PersonalizedRecommendation {
  id: string;
  productId: string;
  recommendationType: 'general' | 'trending' | 'seasonal' | 'bundle' | 'pam_pick';
  confidenceScore: number;
  context: Record<string, any>;
  createdAt: string;
  expiresAt: string;
}

export function usePersonalizedRecommendations() {
  const { user } = useAuth();
  const { region } = useRegion();
  const [recommendations, setRecommendations] = useState<PersonalizedRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [personalizedProducts, setPersonalizedProducts] = useState<ShopProduct[]>([]);

  const fetchRecommendations = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('personalized_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('confidence_score', { ascending: false });

      if (error) throw error;

      setRecommendations(data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const generateRecommendations = useCallback(async () => {
    if (!user) return;

    try {
      // Get user's interaction history
      const { data: interactions, error: interactionsError } = await supabase
        .from('product_interactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (interactionsError) throw interactionsError;

      // Get user's shopping profile
      const { data: profile, error: profileError } = await supabase
        .from('user_shopping_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') throw profileError;

      // Simple recommendation logic based on interaction history
      const productInteractionCounts = interactions?.reduce((acc, interaction) => {
        acc[interaction.product_id] = (acc[interaction.product_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      const allProducts = [...getDigitalProducts(region), ...getAffiliateProducts()];
      const recommendedProducts = allProducts
        .filter(product => product.availableRegions.includes(region))
        .map(product => ({
          product,
          score: productInteractionCounts[product.id] || 0
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      // Create recommendation records
      const newRecommendations = recommendedProducts.map(({ product }) => ({
        user_id: user.id,
        product_id: product.id,
        recommendation_type: 'general' as const,
        confidence_score: Math.random() * 0.5 + 0.5, // Random score between 0.5-1.0
        context: { 
          region,
          generated_at: new Date().toISOString(),
          based_on: 'interaction_history'
        }
      }));

      if (newRecommendations.length > 0) {
        // Clear old recommendations first
        await supabase
          .from('personalized_recommendations')
          .delete()
          .eq('user_id', user.id);

        // Insert new recommendations
        await supabase
          .from('personalized_recommendations')
          .insert(newRecommendations);

        await fetchRecommendations();
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  }, [user, region, fetchRecommendations]);

  const getPersonalizedProducts = useCallback(() => {
    const allProducts = [...getDigitalProducts(region), ...getAffiliateProducts()];
    
    if (recommendations.length === 0) {
      return allProducts.filter(product => product.availableRegions.includes(region));
    }

    const recommendedProductIds = recommendations.map(r => r.productId);
    const recommendedProducts = allProducts.filter(product => 
      recommendedProductIds.includes(product.id) && 
      product.availableRegions.includes(region)
    );

    // Sort by recommendation confidence score
    const sortedProducts = recommendedProducts.sort((a, b) => {
      const aRecommendation = recommendations.find(r => r.productId === a.id);
      const bRecommendation = recommendations.find(r => r.productId === b.id);
      return (bRecommendation?.confidenceScore || 0) - (aRecommendation?.confidenceScore || 0);
    });

    // Fill remaining slots with non-recommended products
    const nonRecommendedProducts = allProducts.filter(product => 
      !recommendedProductIds.includes(product.id) && 
      product.availableRegions.includes(region)
    );

    return [...sortedProducts, ...nonRecommendedProducts];
  }, [recommendations, region]);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user, fetchRecommendations]);

  useEffect(() => {
    setPersonalizedProducts(getPersonalizedProducts());
  }, [getPersonalizedProducts]);

  return {
    recommendations,
    personalizedProducts,
    isLoading,
    generateRecommendations,
    fetchRecommendations
  };
}
