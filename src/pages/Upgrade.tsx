/**
 * Upgrade Page - Trial to paid conversion flow
 * Shows pricing plans and handles subscription conversion
 */

import React, { useState } from 'react';
import { useTrial } from '@/context/TrialContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Check, 
  Crown, 
  Zap, 
  Shield, 
  Users, 
  Infinity,
  Star,
  Clock,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

const pricingPlans = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$9.99',
    period: '/month',
    popular: false,
    savings: null
  },
  {
    id: 'annual',
    name: 'Annual',
    price: '$99.99',
    period: '/year',
    popular: true,
    savings: 'Save $20'
  }
];

const features = [
  'Unlimited route planning and storage',
  'Advanced trip budgeting tools',
  'Real-time fuel price optimization',
  'Offline maps and navigation',
  'Family sharing (up to 5 members)',
  'Premium weather forecasts',
  'Priority customer support',
  'Advanced analytics dashboard',
  'Custom vehicle profiles',
  'Export to all major apps'
];

const trialFeatures = [
  { label: 'Routes saved', limit: '10', unlimited: '∞' },
  { label: 'Storage space', limit: '5 GB', unlimited: '∞' },
  { label: 'Connected devices', limit: '2', unlimited: '∞' },
  { label: 'Family members', limit: '1', unlimited: '5' }
];

export default function Upgrade() {
  const { trialInfo, logEvent, convertToPaid } = useTrial();
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handlePlanSelect = async (planId: string) => {
    setSelectedPlan(planId);
    await logEvent('cta_click', { 
      plan: planId, 
      source: 'upgrade_page' 
    });
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    
    await logEvent('upgrade_attempt', { 
      plan: selectedPlan, 
      trial_day: trialInfo?.dayNumber || 0 
    });
    
    try {
      // In a real implementation, this would integrate with Stripe/payment processor
      const success = await convertToPaid();
      if (success) {
        // Redirect to success page or show success message
        window.location.href = '/payment-success';
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Crown className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold">Upgrade to Premium</h1>
          </div>
          
          {trialInfo && (
            <div className="flex items-center justify-center space-x-4 mb-4">
              {trialInfo.isActive ? (
                <>
                  <Badge variant="outline" className="border-blue-300 text-blue-700">
                    <Clock className="h-3 w-3 mr-1" />
                    {trialInfo.daysLeft} days left
                  </Badge>
                  <Badge variant="outline" className="border-green-300 text-green-700">
                    <Star className="h-3 w-3 mr-1" />
                    {trialInfo.completedMilestones}/5 milestones
                  </Badge>
                </>
              ) : (
                <Badge variant="outline" className="border-amber-300 text-amber-700">
                  Trial ended - Keep your data
                </Badge>
              )}
            </div>
          )}
          
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            {trialInfo?.isExpired 
              ? "Your data is safe! Upgrade to continue where you left off."
              : "Remove all limits and unlock premium features to maximize your adventures."
            }
          </p>
        </div>

        {/* Trial vs Premium Comparison */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-center mb-6">What You Get</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Current Trial */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-center">
                  <Badge variant="secondary" className="mb-2">Current Trial</Badge>
                  <div>Free for 28 days</div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trialFeatures.map((feature, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm">{feature.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {feature.limit}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Premium */}
            <Card className="border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="text-center">
                  <Badge className="mb-2 bg-blue-600">Premium</Badge>
                  <div className="flex items-center justify-center">
                    <Crown className="h-5 w-5 text-blue-600 mr-2" />
                    Unlimited Access
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {trialFeatures.map((feature, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm font-medium">{feature.label}</span>
                    <Badge className="text-xs bg-green-600">
                      <Infinity className="h-3 w-3 mr-1" />
                      {feature.unlimited}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-center mb-6">Choose Your Plan</h2>
          
          <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {pricingPlans.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  "cursor-pointer transition-all duration-200 hover:shadow-lg",
                  selectedPlan === plan.id && "ring-2 ring-blue-500 border-blue-300",
                  plan.popular && "border-blue-300 bg-blue-50"
                )}
                onClick={() => handlePlanSelect(plan.id)}
              >
                <CardHeader className="text-center">
                  {plan.popular && (
                    <Badge className="mx-auto mb-2 bg-blue-600">Most Popular</Badge>
                  )}
                  <CardTitle>
                    <div className="text-2xl font-bold">{plan.price}</div>
                    <div className="text-sm text-gray-600">{plan.period}</div>
                  </CardTitle>
                  {plan.savings && (
                    <Badge variant="outline" className="border-green-300 text-green-700">
                      {plan.savings}
                    </Badge>
                  )}
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>

        {/* Features List */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-center mb-6">Everything Included</h2>
          
          <div className="grid md:grid-cols-2 gap-3 max-w-2xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-6"
          >
            {isUpgrading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5 mr-2" />
                Upgrade Now
                <ArrowRight className="h-5 w-5 ml-2" />
              </>
            )}
          </Button>
          
          <p className="text-sm text-gray-600 mt-4">
            30-day money-back guarantee • Cancel anytime • Secure checkout
          </p>
        </div>
      </div>
    </div>
  );
}