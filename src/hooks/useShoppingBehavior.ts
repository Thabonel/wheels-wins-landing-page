
import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase';

// TypeScript interfaces for tracked data
export interface ProductViewSession {
  productId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  productType: 'digital' | 'affiliate';
  price?: number;
  category: string;
}

export interface CategoryBrowsingSession {
  category: string;
  timeSpent: number;
  productsViewed: number;
  startTime: Date;
  endTime: Date;
}

export interface PriceRangePreference {
  minPrice: number;
  maxPrice: number;
  category: string;
  frequency: number;
  lastUpdated: Date;
}

export interface PurchasePattern {
  productId: string;
  category: string;
  price: number;
  purchaseDate: Date;
  timeToDecision: number; // minutes from first view to purchase
  sessionViews: number;
}

export interface ClickThroughData {
  productType: 'digital' | 'affiliate';
  category: string;
  clicks: number;
  views: number;
  rate: number;
  lastUpdated: Date;
}

export interface SeasonalPreference {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  category: string;
  interactionCount: number;
  purchaseCount: number;
  preference_score: number;
}

export interface ConversionMetrics {
  totalBrowseSessions: number;
  totalPurchases: number;
  conversionRate: number;
  averageSessionDuration: number;
  averageTimeToDecision: number;
  lastCalculated: Date;
}

export interface ShoppingBehaviorData {
  userId: string;
  productViews: ProductViewSession[];
  categoryBrowsing: CategoryBrowsingSession[];
  pricePreferences: PriceRangePreference[];
  purchasePatterns: PurchasePattern[];
  clickThroughRates: ClickThroughData[];
  seasonalPreferences: SeasonalPreference[];
  conversionMetrics: ConversionMetrics;
}

export function useShoppingBehavior() {
  const { user } = useAuth();
  const [behaviorData, setBehaviorData] = useState<ShoppingBehaviorData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  
  // Refs for tracking current sessions
  const currentProductView = useRef<ProductViewSession | null>(null);
  const currentCategorySession = useRef<CategoryBrowsingSession | null>(null);
  const sessionStartTime = useRef<Date>(new Date());

  // Initialize behavior tracking
  useEffect(() => {
    if (user) {
      initializeBehaviorTracking();
      setIsTracking(true);
      sessionStartTime.current = new Date();
    }
  }, [user]);

  const initializeBehaviorTracking = async () => {
    if (!user) return;

    try {
      // Load existing behavior data
      const { data, error } = await supabase
        .from('user_shopping_behavior')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading behavior data:', error);
        return;
      }

      if (data) {
        setBehaviorData({
          userId: user.id,
          productViews: data.product_views || [],
          categoryBrowsing: data.category_browsing || [],
          pricePreferences: data.price_preferences || [],
          purchasePatterns: data.purchase_patterns || [],
          clickThroughRates: data.click_through_rates || [],
          seasonalPreferences: data.seasonal_preferences || [],
          conversionMetrics: data.conversion_metrics || {
            totalBrowseSessions: 0,
            totalPurchases: 0,
            conversionRate: 0,
            averageSessionDuration: 0,
            averageTimeToDecision: 0,
            lastCalculated: new Date()
          }
        });
      } else {
        // Initialize new behavior data
        const newBehaviorData: ShoppingBehaviorData = {
          userId: user.id,
          productViews: [],
          categoryBrowsing: [],
          pricePreferences: [],
          purchasePatterns: [],
          clickThroughRates: [],
          seasonalPreferences: [],
          conversionMetrics: {
            totalBrowseSessions: 0,
            totalPurchases: 0,
            conversionRate: 0,
            averageSessionDuration: 0,
            averageTimeToDecision: 0,
            lastCalculated: new Date()
          }
        };
        setBehaviorData(newBehaviorData);
        await saveBehaviorData(newBehaviorData);
      }
    } catch (error) {
      console.error('Error initializing behavior tracking:', error);
    }
  };

  const saveBehaviorData = async (data: ShoppingBehaviorData) => {
    if (!user) return;

    try {
      await supabase
        .from('user_shopping_behavior')
        .upsert({
          user_id: user.id,
          product_views: data.productViews,
          category_browsing: data.categoryBrowsing,
          price_preferences: data.pricePreferences,
          purchase_patterns: data.purchasePatterns,
          click_through_rates: data.clickThroughRates,
          seasonal_preferences: data.seasonalPreferences,
          conversion_metrics: data.conversionMetrics,
          updated_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error saving behavior data:', error);
    }
  };

  // Track product view
  const trackProductView = useCallback((productId: string, productType: 'digital' | 'affiliate', price: number | undefined, category: string) => {
    if (!isTracking || !behaviorData) return;

    // End previous product view if exists
    if (currentProductView.current) {
      endProductView();
    }

    // Start new product view session
    currentProductView.current = {
      productId,
      startTime: new Date(),
      productType,
      price,
      category
    };
  }, [isTracking, behaviorData]);

  const endProductView = useCallback(() => {
    if (!currentProductView.current || !behaviorData) return;

    const endTime = new Date();
    const duration = endTime.getTime() - currentProductView.current.startTime.getTime();

    const completedView: ProductViewSession = {
      ...currentProductView.current,
      endTime,
      duration
    };

    const updatedData = {
      ...behaviorData,
      productViews: [...behaviorData.productViews, completedView]
    };

    setBehaviorData(updatedData);
    saveBehaviorData(updatedData);
    
    // Update price preferences
    if (completedView.price) {
      updatePricePreferences(completedView.category, completedView.price);
    }
    
    // Update seasonal preferences
    updateSeasonalPreferences(completedView.category);

    currentProductView.current = null;
  }, [behaviorData]);

  // Track category browsing
  const trackCategoryBrowsing = useCallback((category: string) => {
    if (!isTracking || !behaviorData) return;

    // End previous category session
    if (currentCategorySession.current && currentCategorySession.current.category !== category) {
      endCategorySession();
    }

    if (!currentCategorySession.current || currentCategorySession.current.category !== category) {
      currentCategorySession.current = {
        category,
        timeSpent: 0,
        productsViewed: 0,
        startTime: new Date(),
        endTime: new Date()
      };
    }

    currentCategorySession.current.productsViewed += 1;
  }, [isTracking, behaviorData]);

  const endCategorySession = useCallback(() => {
    if (!currentCategorySession.current || !behaviorData) return;

    const endTime = new Date();
    const timeSpent = endTime.getTime() - currentCategorySession.current.startTime.getTime();

    const completedSession: CategoryBrowsingSession = {
      ...currentCategorySession.current,
      endTime,
      timeSpent
    };

    const updatedData = {
      ...behaviorData,
      categoryBrowsing: [...behaviorData.categoryBrowsing, completedSession]
    };

    setBehaviorData(updatedData);
    saveBehaviorData(updatedData);

    currentCategorySession.current = null;
  }, [behaviorData]);

  // Track purchase
  const trackPurchase = useCallback((productId: string, category: string, price: number) => {
    if (!behaviorData) return;

    // Calculate time to decision
    const productViews = behaviorData.productViews.filter(view => view.productId === productId);
    const firstView = productViews[0];
    const timeToDecision = firstView 
      ? (new Date().getTime() - firstView.startTime.getTime()) / (1000 * 60) // minutes
      : 0;

    const purchasePattern: PurchasePattern = {
      productId,
      category,
      price,
      purchaseDate: new Date(),
      timeToDecision,
      sessionViews: productViews.length
    };

    const updatedData = {
      ...behaviorData,
      purchasePatterns: [...behaviorData.purchasePatterns, purchasePattern]
    };

    // Update conversion metrics
    updatedData.conversionMetrics = {
      ...updatedData.conversionMetrics,
      totalPurchases: updatedData.conversionMetrics.totalPurchases + 1,
      lastCalculated: new Date()
    };

    setBehaviorData(updatedData);
    saveBehaviorData(updatedData);
    
    // Update price preferences with purchase weight
    updatePricePreferences(category, price, true);
  }, [behaviorData]);

  // Track click-through rates
  const trackClickThrough = useCallback((productType: 'digital' | 'affiliate', category: string) => {
    if (!behaviorData) return;

    const existingCTR = behaviorData.clickThroughRates.find(
      ctr => ctr.productType === productType && ctr.category === category
    );

    let updatedCTRs;
    if (existingCTR) {
      updatedCTRs = behaviorData.clickThroughRates.map(ctr => 
        ctr.productType === productType && ctr.category === category
          ? { ...ctr, clicks: ctr.clicks + 1, rate: (ctr.clicks + 1) / ctr.views, lastUpdated: new Date() }
          : ctr
      );
    } else {
      updatedCTRs = [...behaviorData.clickThroughRates, {
        productType,
        category,
        clicks: 1,
        views: 1,
        rate: 1,
        lastUpdated: new Date()
      }];
    }

    const updatedData = {
      ...behaviorData,
      clickThroughRates: updatedCTRs
    };

    setBehaviorData(updatedData);
    saveBehaviorData(updatedData);
  }, [behaviorData]);

  const trackProductView = useCallback((productType: 'digital' | 'affiliate', category: string) => {
    if (!behaviorData) return;

    const existingCTR = behaviorData.clickThroughRates.find(
      ctr => ctr.productType === productType && ctr.category === category
    );

    let updatedCTRs;
    if (existingCTR) {
      updatedCTRs = behaviorData.clickThroughRates.map(ctr => 
        ctr.productType === productType && ctr.category === category
          ? { ...ctr, views: ctr.views + 1, rate: ctr.clicks / (ctr.views + 1), lastUpdated: new Date() }
          : ctr
      );
    } else {
      updatedCTRs = [...behaviorData.clickThroughRates, {
        productType,
        category,
        clicks: 0,
        views: 1,
        rate: 0,
        lastUpdated: new Date()
      }];
    }

    const updatedData = {
      ...behaviorData,
      clickThroughRates: updatedCTRs
    };

    setBehaviorData(updatedData);
    saveBehaviorData(updatedData);
  }, [behaviorData]);

  // Update price preferences
  const updatePricePreferences = useCallback((category: string, price: number, isPurchase = false) => {
    if (!behaviorData) return;

    const existingPref = behaviorData.pricePreferences.find(pref => pref.category === category);
    const weight = isPurchase ? 3 : 1; // Purchases have more weight

    let updatedPrefs;
    if (existingPref) {
      // Update existing preference with weighted average
      const totalWeight = existingPref.frequency + weight;
      const newMinPrice = Math.min(existingPref.minPrice, price);
      const newMaxPrice = Math.max(existingPref.maxPrice, price);
      
      updatedPrefs = behaviorData.pricePreferences.map(pref =>
        pref.category === category
          ? {
              ...pref,
              minPrice: newMinPrice,
              maxPrice: newMaxPrice,
              frequency: totalWeight,
              lastUpdated: new Date()
            }
          : pref
      );
    } else {
      updatedPrefs = [...behaviorData.pricePreferences, {
        minPrice: price,
        maxPrice: price,
        category,
        frequency: weight,
        lastUpdated: new Date()
      }];
    }

    const updatedData = {
      ...behaviorData,
      pricePreferences: updatedPrefs
    };

    setBehaviorData(updatedData);
    saveBehaviorData(updatedData);
  }, [behaviorData]);

  // Update seasonal preferences
  const updateSeasonalPreferences = useCallback((category: string, isPurchase = false) => {
    if (!behaviorData) return;

    const currentSeason = getCurrentSeason();
    const existingPref = behaviorData.seasonalPreferences.find(
      pref => pref.season === currentSeason && pref.category === category
    );

    let updatedPrefs;
    if (existingPref) {
      updatedPrefs = behaviorData.seasonalPreferences.map(pref =>
        pref.season === currentSeason && pref.category === category
          ? {
              ...pref,
              interactionCount: pref.interactionCount + 1,
              purchaseCount: isPurchase ? pref.purchaseCount + 1 : pref.purchaseCount,
              preference_score: calculatePreferenceScore(pref.interactionCount + 1, isPurchase ? pref.purchaseCount + 1 : pref.purchaseCount)
            }
          : pref
      );
    } else {
      updatedPrefs = [...behaviorData.seasonalPreferences, {
        season: currentSeason,
        category,
        interactionCount: 1,
        purchaseCount: isPurchase ? 1 : 0,
        preference_score: calculatePreferenceScore(1, isPurchase ? 1 : 0)
      }];
    }

    const updatedData = {
      ...behaviorData,
      seasonalPreferences: updatedPrefs
    };

    setBehaviorData(updatedData);
    saveBehaviorData(updatedData);
  }, [behaviorData]);

  // Helper functions
  const getCurrentSeason = (): 'spring' | 'summer' | 'fall' | 'winter' => {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  };

  const calculatePreferenceScore = (interactions: number, purchases: number): number => {
    return (purchases / interactions) * 0.7 + (interactions / 100) * 0.3;
  };

  // Calculate conversion metrics periodically
  const updateConversionMetrics = useCallback(() => {
    if (!behaviorData) return;

    const totalSessions = behaviorData.categoryBrowsing.length;
    const totalPurchases = behaviorData.purchasePatterns.length;
    const conversionRate = totalSessions > 0 ? totalPurchases / totalSessions : 0;
    
    const avgSessionDuration = behaviorData.categoryBrowsing.length > 0
      ? behaviorData.categoryBrowsing.reduce((sum, session) => sum + session.timeSpent, 0) / behaviorData.categoryBrowsing.length
      : 0;

    const avgTimeToDecision = behaviorData.purchasePatterns.length > 0
      ? behaviorData.purchasePatterns.reduce((sum, pattern) => sum + pattern.timeToDecision, 0) / behaviorData.purchasePatterns.length
      : 0;

    const updatedMetrics: ConversionMetrics = {
      totalBrowseSessions: totalSessions,
      totalPurchases,
      conversionRate,
      averageSessionDuration: avgSessionDuration,
      averageTimeToDecision: avgTimeToDecision,
      lastCalculated: new Date()
    };

    const updatedData = {
      ...behaviorData,
      conversionMetrics: updatedMetrics
    };

    setBehaviorData(updatedData);
    saveBehaviorData(updatedData);
  }, [behaviorData]);

  // Cleanup function to end sessions
  const endCurrentSessions = useCallback(() => {
    endProductView();
    endCategorySession();
    updateConversionMetrics();
  }, [endProductView, endCategorySession, updateConversionMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCurrentSessions();
    };
  }, [endCurrentSessions]);

  return {
    behaviorData,
    isTracking,
    trackProductView,
    endProductView,
    trackCategoryBrowsing,
    endCategorySession,
    trackPurchase,
    trackClickThrough,
    trackProductView,
    updateConversionMetrics,
    endCurrentSessions
  };
}
