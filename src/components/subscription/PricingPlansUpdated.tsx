
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2, Crown, Star } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const PricingPlansUpdated = () => {
  const { isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubscription = async (priceId: string, planName: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to subscribe");
      navigate("/auth");
      return;
    }

    setIsLoading(priceId);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId,
          successUrl: `${window.location.origin}/payment-success`,
          cancelUrl: `${window.location.origin}/payment-canceled`,
        }
      });

      if (error) throw error;

      // Open Stripe checkout in a new tab
      window.open(data.url, '_blank');
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("Failed to start checkout process. Please try again later.");
    } finally {
      setIsLoading(null);
    }
  };

  const handleStartTrial = () => {
    if (!isAuthenticated) {
      navigate("/auth");
      return;
    }
    
    toast.success("Welcome! Your 30-day free trial has started - no payment needed!");
    navigate("/you");
  };

  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50" id="pricing">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Adventure</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Try before you commit! Start with our 30-day free trial, then select the perfect plan to maximize your travel experience with PAM's help.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Trial Plan */}
          <Card className="border-2 border-primary/20 flex flex-col">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">First Month Free</CardTitle>
              <CardDescription className="text-sm">Try before you commit</CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-4 flex-grow">
              <div className="mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground ml-1">for 30 days</span>
              </div>
              <ul className="space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Full access to our platform and community</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Unlimited trip planning with PAM</span>
                </li>
                <li className="flex items-start text-muted-foreground">
                  <span className="h-5 w-5 mr-2 flex-shrink-0">*</span>
                  <span>Video Course not included</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleStartTrial}
              >
                Start Free Trial
              </Button>
            </CardFooter>
          </Card>

          {/* Monthly Plan */}
          <Card className="border-2 border-muted flex flex-col">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Monthly Membership</CardTitle>
              <CardDescription className="text-sm">Full access to our platform and community</CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-4 flex-grow">
              <div className="mb-6">
                <span className="text-4xl font-bold">$18</span>
                <span className="text-muted-foreground ml-1">/month</span>
              </div>
              <ul className="space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Full access to our platform and community</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Unlimited trip planning with PAM</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Priority customer support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => handleSubscription("price_1RJDRSDXysaVZSVhqChkrYBw", "Monthly Plan")}
                disabled={isLoading === "price_1RJDRSDXysaVZSVhqChkrYBw"}
              >
                {isLoading === "price_1RJDRSDXysaVZSVhqChkrYBw" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : "Select Plan"}
              </Button>
            </CardFooter>
          </Card>

          {/* Annual Plan */}
          <Card className="border-2 border-purple-200 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-purple-600 text-white px-3 py-1 text-xs font-semibold flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Best Value
            </div>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Annual Membership</CardTitle>
              <CardDescription className="text-sm">Save 33% plus get the $97 Video Course FREE</CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-4 flex-grow">
              <div className="mb-6">
                <span className="text-4xl font-bold">$216</span>
                <span className="text-muted-foreground ml-1">/year</span>
                <div className="text-sm text-green-600 font-medium">
                  Save $97 vs Monthly!
                </div>
              </div>
              <ul className="space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Full access to our platform and community</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Unlimited trip planning with PAM</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Priority customer support</span>
                </li>
                <li className="flex items-start">
                  <Star className="h-5 w-5 mr-2 text-purple-600 flex-shrink-0" />
                  <span className="font-medium text-purple-700">
                    FREE Video Course ($97 value)
                  </span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => handleSubscription("price_1RJDV7DXysaVZSVhFRfsFqzv", "Annual Plan")}
                disabled={isLoading === "price_1RJDV7DXysaVZSVhFRfsFqzv"}
              >
                {isLoading === "price_1RJDV7DXysaVZSVhFRfsFqzv" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : "Select Plan"}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            All plans include access to our community, trip planning tools, and PAM AI assistant.
            <br />
            Cancel anytime. No long-term commitments.
          </p>
        </div>
      </div>
    </section>
  );
};

export default PricingPlansUpdated;
