import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, DollarSign, Briefcase, TrendingUp, Users, Lightbulb, ChevronRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface MoneyMakerOnboardingProps {
  onDismiss?: () => void;
}

export default function MoneyMakerOnboarding({ onDismiss }: MoneyMakerOnboardingProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Check if user has seen the onboarding before
    const hasSeenOnboarding = localStorage.getItem("moneymaker-onboarding-seen");
    if (!hasSeenOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem("moneymaker-onboarding-seen", "true");
    setIsVisible(false);
    onDismiss?.();
  };

  const handleSkipTour = () => {
    handleDismiss();
  };

  const steps = [
    {
      icon: <DollarSign className="h-5 w-5" />,
      title: "Track Your Road Income",
      description: "Log all your income sources while traveling - from remote work to gig jobs to selling crafts at markets."
    },
    {
      icon: <Briefcase className="h-5 w-5" />,
      title: "Explore Income Ideas",
      description: "Browse the Hustle Board for proven ways other travelers make money on the road."
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: "Monitor Your Progress",
      description: "Visualize your income streams with charts and track which ideas work best for you."
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Learn from the Community",
      description: "See what's working for other RVers and share your own successful income strategies."
    },
    {
      icon: <Lightbulb className="h-5 w-5" />,
      title: "Get PAM's Suggestions",
      description: "Receive personalized income ideas from PAM based on your skills and location."
    }
  ];

  if (!isVisible) return null;

  // Show welcome card for first-time users
  if (currentStep === 0) {
    return (
      <Alert className="mb-6 border-blue-200 bg-blue-50">
        <DollarSign className="h-5 w-5" />
        <AlertTitle className="text-lg font-semibold">Welcome to Money Makers! 🚐💰</AlertTitle>
        <AlertDescription className="mt-3 space-y-3">
          <p>
            Turn your travels into income opportunities! This tool helps you track and discover ways to earn money while living on the road.
          </p>
          <div className="flex gap-2 mt-4">
            <Button size="sm" onClick={() => setCurrentStep(1)}>
              Take Quick Tour
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleSkipTour}>
              Skip for Now
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show tour steps
  return (
    <Card className="mb-6 border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <span className="text-sm font-normal text-muted-foreground">Step {currentStep} of {steps.length}</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              {steps[currentStep - 1].icon}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">{steps[currentStep - 1].title}</h3>
              <p className="text-sm text-muted-foreground">
                {steps[currentStep - 1].description}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-8 rounded-full transition-colors ${
                    index < currentStep ? "bg-primary" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {currentStep > 1 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentStep(currentStep - 1)}
                >
                  Back
                </Button>
              )}
              {currentStep < steps.length ? (
                <Button
                  size="sm"
                  onClick={() => setCurrentStep(currentStep + 1)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={handleDismiss}
                >
                  Get Started
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}