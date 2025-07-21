
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

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isExpired?: boolean;
}

export default function UpgradeModal({ open, onOpenChange, isExpired = false }: UpgradeModalProps) {
  const handleSubscribe = async (plan: 'monthly' | 'annual') => {
    // This will be connected to Stripe checkout
    console.log(`Subscribing to ${plan} plan`);
    // Implementation will call Stripe checkout
  };

  const testimonials = [
    { name: "Sarah M.", text: "PAM has saved me hundreds of dollars on my road trips!" },
    { name: "Mike R.", text: "The annual plan with video course is incredible value." },
    { name: "Lisa K.", text: "Best investment for my RV lifestyle." }
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
              <CardDescription>Full access to platform and community</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="mb-6">
                <span className="text-4xl font-bold">$18</span>
                <span className="text-muted-foreground ml-1">/month</span>
              </div>
              <ul className="space-y-3 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>Full access to our platform and community</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>Unlimited trip planning with PAM</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>Priority customer support</span>
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
                <span className="text-4xl font-bold">$216</span>
                <span className="text-muted-foreground ml-1">/year</span>
                <div className="text-sm text-green-600 font-medium">
                  Save $97 vs Monthly!
                </div>
              </div>
              <ul className="space-y-3 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>Full access to our platform and community</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>Unlimited trip planning with PAM</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0 mt-0.5" />
                  <span>Priority customer support</span>
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
