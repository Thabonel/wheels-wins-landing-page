
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { TrialConfirmationDialog } from "@/components/TrialConfirmationDialog";
import { useSubscriptionFlow } from "@/hooks/useSubscriptionFlow";
import { useRegion } from "@/context/RegionContext";
import { convertPrice } from "@/services/currencyService";
import { useTranslation } from "react-i18next";

const PricingPlans = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showConfirmation, setShowConfirmation, selectedPlan, setSelectedPlan } = useSubscriptionFlow();
  const { region, regionConfig } = useRegion();

  // Convert prices based on region
  const monthlyPrice = convertPrice(9.99, region);
  const annualPrice = convertPrice(99, region);
  const videoCourseValue = convertPrice(97, region);

  const handleSubscription = async (priceId: string, planName: string) => {
    // If user is not authenticated, store the plan and redirect to signup
    if (!isAuthenticated) {
      const planData = { priceId, planName };
      sessionStorage.setItem('selectedPlan', JSON.stringify(planData));
      navigate("/signup");
      return;
    }

    // If user is authenticated, show confirmation dialog
    setSelectedPlan({ priceId, planName });
    setShowConfirmation(true);
  };

  const handleTrialConfirm = async () => {
    if (!selectedPlan) return;

    setIsLoading(selectedPlan.priceId);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: JSON.stringify({
          priceId: selectedPlan.priceId,
          successUrl: `${window.location.origin}/onboarding`,
          cancelUrl: `${window.location.origin}/`,
        })
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Failed to start checkout process. Please try again later.");
    } finally {
      setIsLoading(null);
      setShowConfirmation(false);
    }
  };

  const handleTrialCancel = () => {
    setShowConfirmation(false);
    setSelectedPlan(null);
  };

  return (
    <>
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('pricing.title')}</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t('pricing.subtitle')}
              <span className="block text-sm mt-2">{t('pricing.currency_note', { currency: regionConfig.currency })}</span>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Trial Plan */}
            <Card className="border-2 border-green-500/20 relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-xs font-semibold">
                {t('pricing.free_trial.badge')}
              </div>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{t('pricing.free_trial.title')}</CardTitle>
                <CardDescription className="text-sm">{t('pricing.free_trial.description')}</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-4 flex-grow">
                <div className="mb-6">
                  <span className="text-4xl font-bold">{regionConfig.currencySymbol}0</span>
                  <span className="text-muted-foreground ml-1">{t('pricing.free_trial.duration')}</span>
                </div>
                <ul className="space-y-2 text-left">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{t('pricing.free_trial.feature1')}</span>
                  </li>
                  <li className="flex items-start text-sm text-muted-foreground">
                    <span className="mr-2">*</span>
                    <span>{t('pricing.free_trial.feature2')}</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-green-500 hover:bg-green-600"
                  onClick={() => handleSubscription("price_1QT2VtDXysaVZSVhq8YjLRgX", "Free Trial")}
                  disabled={isLoading === "price_1QT2VtDXysaVZSVhq8YjLRgX"}
                >
                  {isLoading === "price_1QT2VtDXysaVZSVhq8YjLRgX" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('pricing.processing')}
                    </>
                  ) : t('pricing.free_trial.button')}
                </Button>
              </CardFooter>
            </Card>

            {/* Monthly Plan */}
            <Card className="border-2 border-primary/20 flex flex-col">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{t('pricing.monthly.title')}</CardTitle>
                <CardDescription className="text-sm">{t('pricing.monthly.description')}</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-4 flex-grow">
                <div className="mb-6">
                  <span className="text-4xl font-bold">{monthlyPrice.formatted}</span>
                  <span className="text-muted-foreground ml-1">{t('pricing.monthly.period')}</span>
                </div>
                <ul className="space-y-2 text-left">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>{t('pricing.monthly.feature1')}</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => handleSubscription("price_1QT2XeDXysaVZSVhFiWGHV4Y", "Monthly Plan")}
                  disabled={isLoading === "price_1QT2XeDXysaVZSVhFiWGHV4Y"}
                >
                  {isLoading === "price_1QT2XeDXysaVZSVhFiWGHV4Y" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('pricing.processing')}
                    </>
                  ) : t('pricing.monthly.button')}
                </Button>
              </CardFooter>
            </Card>

            {/* Annual Plan */}
            <Card className="border-2 border-accent flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-3 py-1 text-xs font-semibold">
                {t('pricing.annual.badge')}
              </div>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">{t('pricing.annual.title')}</CardTitle>
                <CardDescription className="text-sm">{t('pricing.annual.description')}</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-4 flex-grow">
                <div className="mb-6">
                  <span className="text-4xl font-bold">{annualPrice.formatted}</span>
                  <span className="text-muted-foreground ml-1">{t('pricing.annual.period')}</span>
                </div>
                <ul className="space-y-2 text-left">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>{t('pricing.annual.feature1')}</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>{t('pricing.annual.feature2', { value: videoCourseValue.formatted })}</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-accent hover:bg-accent/90"
                  onClick={() => handleSubscription("price_1QT2YqDXysaVZSVh7XaE9rJ8", "Annual Plan")}
                  disabled={isLoading === "price_1QT2YqDXysaVZSVh7XaE9rJ8"}
                >
                  {isLoading === "price_1QT2YqDXysaVZSVh7XaE9rJ8" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('pricing.processing')}
                    </>
                  ) : t('pricing.annual.button')}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      <TrialConfirmationDialog
        isOpen={showConfirmation}
        onConfirm={handleTrialConfirm}
        onCancel={handleTrialCancel}
        planName={selectedPlan?.planName || ""}
      />
    </>
  );
};

export default PricingPlans;
