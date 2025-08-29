import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  PieChart, 
  Calendar,
  Lightbulb,
  Briefcase,
  X,
  ChevronRight
} from 'lucide-react';

interface WinsOnboardingProps {
  onComplete: () => void;
}

const WinsOnboarding: React.FC<WinsOnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('winsOnboardingComplete');
    if (!hasSeenOnboarding) {
      setShow(true);
    }
  }, []);

  const steps = [
    {
      icon: DollarSign,
      title: "Track Every Dollar",
      description: "Use Quick Actions to log expenses instantly - perfect for gas stations and on-the-go purchases."
    },
    {
      icon: TrendingUp,
      title: "Monitor Your Income",
      description: "Track multiple income sources including remote work, side hustles, and passive income."
    },
    {
      icon: PieChart,
      title: "Visual Insights",
      description: "See where your money goes with interactive charts and spending breakdowns."
    },
    {
      icon: Calendar,
      title: "Budget Management",
      description: "Set and track budgets by category to stay on top of your RV lifestyle expenses."
    },
    {
      icon: Lightbulb,
      title: "PAM's Financial Tips",
      description: "Get AI-powered insights and money-saving tips tailored to your travel patterns."
    },
    {
      icon: Briefcase,
      title: "Make Money on the Road",
      description: "Discover income opportunities perfect for the RV lifestyle in our Money Maker tab."
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem('winsOnboardingComplete', 'true');
    setShow(false);
    onComplete();
  };

  if (!show) return null;

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="relative">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleComplete}
            className="absolute right-4 top-4"
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            Welcome to Wins Financial Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-6">
            <div className="p-4 bg-primary/5 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Icon className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">{currentStepData.title}</h3>
            <p className="text-muted-foreground">{currentStepData.description}</p>
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-colors ${
                  index === currentStep ? 'bg-primary' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
            >
              Previous
            </Button>
            <Button onClick={handleNext}>
              {currentStep === steps.length - 1 ? "Get Started" : "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            {currentStep + 1} of {steps.length}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default WinsOnboarding;