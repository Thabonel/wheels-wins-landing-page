
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

const PricingPlans = () => {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showConfirmation, setShowConfirmation, selectedPlan, setSelectedPlan } = useSubscriptionFlow();
  const { region, regionConfig } = useRegion();

  // Convert prices based on region
  const monthlyPrice = convertPrice(18, region);
  const annualPrice = convertPrice(216, region);
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Plan</h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Select the perfect plan for your journey. Start with a free trial on any plan.
              <span className="block text-sm mt-2">Prices shown in {regionConfig.currency}</span>
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Trial Plan */}
            <Card className="border-2 border-green-500/20 relative overflow-hidden flex flex-col">
              <div className="absolute top-0 right-0 bg-green-500 text-white px-3 py-1 text-xs font-semibold">
                Free Trial
              </div>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">First Month Free</CardTitle>
                <CardDescription className="text-sm">Try before you commit</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-4 flex-grow">
                <div className="mb-6">
                  <span className="text-4xl font-bold">{regionConfig.currencySymbol}0</span>
                  <span className="text-muted-foreground ml-1">for 30 days</span>
                </div>
                <ul className="space-y-2 text-left">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>Full access to our platform and community</span>
                  </li>
                  <li className="flex items-start text-sm text-muted-foreground">
                    <span className="mr-2">*</span>
                    <span>Video Course not included</span>
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
                      Processing...
                    </>
                  ) : "Get Started"}
                </Button>
              </CardFooter>
            </Card>

            {/* Monthly Plan */}
            <Card className="border-2 border-primary/20 flex flex-col">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">Monthly Membership</CardTitle>
                <CardDescription className="text-sm">Full access to our platform and community</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-4 flex-grow">
                <div className="mb-6">
                  <span className="text-4xl font-bold">{monthlyPrice.formatted}</span>
                  <span className="text-muted-foreground ml-1">/month</span>
                </div>
                <ul className="space-y-2 text-left">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Full access to our platform and community</span>
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
                      Processing...
                    </>
                  ) : "Select Plan"}
                </Button>
              </CardFooter>
            </Card>

            {/* Annual Plan */}
            <Card className="border-2 border-accent flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-3 py-1 text-xs font-semibold">
                Best Value
              </div>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">Annual Membership</CardTitle>
                <CardDescription className="text-sm">Save 33% plus get the $97 Video Course FREE</CardDescription>
              </CardHeader>
              <CardContent className="text-center pb-4 flex-grow">
                <div className="mb-6">
                  <span className="text-4xl font-bold">{annualPrice.formatted}</span>
                  <span className="text-muted-foreground ml-1">/year</span>
                </div>
                <ul className="space-y-2 text-left">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Full access to our platform and community</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                    <span>Includes Video Course ({videoCourseValue.formatted} value)</span>
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
                      Processing...
                    </>
                  ) : "Select Plan"}
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
