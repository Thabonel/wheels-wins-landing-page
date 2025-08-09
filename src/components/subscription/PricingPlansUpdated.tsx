
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/services/api";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useRegion } from "@/context/RegionContext";
import { convertPrice } from "@/services/currencyService";

const PricingPlansUpdated = () => {
  const { isAuthenticated } = useAuth();
  const { region } = useRegion();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  // AUD base prices
  const basicPrice = convertPrice(9, region);
  const premiumPrice = convertPrice(18, region);

  const handleSubscription = async (priceId: string, planName: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to subscribe");
      navigate("/auth");
      return;
    }

    setIsLoading(priceId);
    
    try {
      const response = await apiFetch('/api/v1/subscription/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/payment-canceled`,
        })
      });

      if (!response.ok) throw new Error('Request failed');

      const data = await response.json();
      window.location.href = data.url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Failed to start checkout process. Please try again later.");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Plan</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Select the perfect plan for your journey.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Basic Plan */}
          <Card className="border-2 border-primary/20 flex flex-col">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Basic Plan</CardTitle>
              <CardDescription className="text-sm">Get started with essential features</CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-4 flex-grow">
              <div className="mb-6">
                <span className="text-4xl font-bold">{basicPrice.formatted}</span>
                <span className="text-muted-foreground ml-1">/month</span>
              </div>
              <ul className="space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Core features access</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => handleSubscription("price_basic", "Basic Plan")}
                disabled={isLoading === "price_basic"}
              >
                {isLoading === "price_basic" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : "Get Started"}
              </Button>
            </CardFooter>
          </Card>

          {/* Premium Plan */}
          <Card className="border-2 border-accent flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-3 py-1 text-xs font-semibold">
              Popular
            </div>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Premium Plan</CardTitle>
              <CardDescription className="text-sm">Full access with premium features</CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-4 flex-grow">
              <div className="mb-6">
                <span className="text-4xl font-bold">{premiumPrice.formatted}</span>
                <span className="text-muted-foreground ml-1">/month</span>
              </div>
              <ul className="space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>All features included</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Priority support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-accent hover:bg-accent/90"
                onClick={() => handleSubscription("price_premium", "Premium Plan")}
                disabled={isLoading === "price_premium"}
              >
                {isLoading === "price_premium" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : "Go Premium"}
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PricingPlansUpdated;
