
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/common/AnimatedDialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Star, Crown } from 'lucide-react';
import { useRegion } from "@/context/RegionContext";
import { convertPrice } from "@/services/currencyService";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isExpired?: boolean;
}

export default function UpgradeModal({ open, onOpenChange, isExpired = false }: UpgradeModalProps) {
  const { region } = useRegion();
  
  // AUD base prices
  const monthlyPrice = convertPrice(18, region);
  const annualPrice = convertPrice(216, region);
  const courseSavings = convertPrice(97, region);

  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    // This will be connected to Stripe checkout
    console.log(`Subscribing to ${plan} plan`);
    // Implementation will call Stripe checkout
  };

  const testimonials = [
    { name: "Sarah M.", text: "PAM's saved me hundreds on gas and campgrounds. Pays for itself." },
    { name: "Mike R.", text: "Annual plan is a no-brainer. The video course alone is worth it." },
    { name: "Lisa K.", text: "Worth every penny. Wish I'd signed up sooner." }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <DialogTitle className="text-2xl">
            {isExpired ? 'Your Free Trial Has Ended' : 'Choose Your Plan'}
          </DialogTitle>
          <DialogDescription className="text-lg">
            Thanks for trying PAM! Join our community to continue accessing all features.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* Monthly Plan */}
          <Card className="border-2 border-muted">
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Monthly Membership</CardTitle>
              <CardDescription>Everything included</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-6">
                <span className="text-4xl font-bold">{monthlyPrice.formatted}</span>
                <span className="text-muted-foreground ml-1">/month</span>
              </div>
              <ul className="space-y-3 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>Access to everything (PAM, community, all features)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>Keep all your trips organized in one place</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>We actually answer when you need help</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => handleSubscribe('monthly')}
              >
                Choose Monthly
              </Button>
            </CardFooter>
          </Card>

          {/* Annual Plan */}
          <Card className="border-2 border-purple-200 relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-purple-600 text-white px-4 py-1">
                <Crown className="w-3 h-3 mr-1" />
                Best Value
              </Badge>
            </div>
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-xl">Annual Membership</CardTitle>
              <CardDescription>Save 33% + FREE $97 Video Course</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-6">
                <span className="text-4xl font-bold">{annualPrice.formatted}</span>
                <span className="text-muted-foreground ml-1">/year</span>
                <div className="text-sm text-green-600 font-medium">
                  Save {courseSavings.formatted} vs Monthly!
                </div>
              </div>
              <ul className="space-y-3 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>Access to everything (PAM, community, all features)</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>Keep all your trips organized in one place</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>We actually answer when you need help</span>
                </li>
                <li className="flex items-start">
                  <Star className="h-5 w-5 mr-2 text-purple-600 flex-shrink-0 mt-0.5" />
                  <span className="font-medium text-purple-700">
                    FREE Video Course ($97 value)
                  </span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700" 
                onClick={() => handleSubscribe('annual')}
              >
                Choose Annual
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Testimonials */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-center mb-4">What Our Members Say</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="text-center p-4 bg-muted rounded-lg">
                <p className="text-sm italic">"{testimonial.text}"</p>
                <p className="text-xs font-medium mt-2">- {testimonial.name}</p>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
