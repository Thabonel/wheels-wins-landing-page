import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const TransitionNavigatorFeature = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      number: "01",
      title: "Step-by-Step Checklist",
      description:
        "From downsizing to departure day - never miss a critical task",
    },
    {
      number: "02",
      title: "Smart Timeline",
      description:
        "Know exactly what to do and when, customized to your departure date",
    },
    {
      number: "03",
      title: "Auto-Hides When Done",
      description:
        "Once you hit the road, the planner gracefully gets out of your way",
    },
  ];

  const includedFeatures = [
    {
      title: "Vehicle Modifications Tracker",
      description: "Plan upgrades, track costs, manage your build",
    },
    {
      title: "Equipment List Manager",
      description: "Never forget essential gear - organized by priority",
    },
    {
      title: "Digital Life Consolidation",
      description: "Cancel services, go paperless, simplify your life",
    },
    {
      title: "Shakedown Trip Logger",
      description: "Test everything before you go all-in",
    },
    {
      title: "Psychological Support Tools",
      description: "Navigate the emotional side of major life change",
    },
    {
      title: "Launch Week Countdown",
      description: "Final week checklist - nothing gets forgotten",
    },
  ];

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/transition");
    } else {
      navigate("/signup");
    }
  };

  return (
    <section className="py-20 md:py-28 bg-muted/30 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center mb-16">
          <span className="inline-block bg-secondary/10 text-secondary px-4 py-2 rounded-full text-sm font-medium mb-4">
            Life Transition Navigator
          </span>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-light tracking-tight text-foreground mb-4">
            Planning to Hit the{" "}
            <span className="font-medium text-primary">Road</span>?
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            We know the transition from traditional life to full-time RV living
            can feel overwhelming. That's why we built a complete planning
            system to guide you every step of the way.
          </p>
        </div>

        {/* Feature cards - number-based, no icons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-border/50 shadow-warm hover:shadow-warm-lg transition-all hover:-translate-y-1 bg-card"
            >
              <CardContent className="pt-8 text-center">
                <span className="text-5xl font-display font-light text-muted-foreground/30 mb-4 block">
                  {feature.number}
                </span>
                <h3 className="text-lg font-display font-medium text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* What's included section */}
        <div className="bg-card rounded-2xl shadow-warm-lg p-8 md:p-12 max-w-4xl mx-auto border border-border/50">
          <h3 className="text-2xl font-display font-medium mb-8 text-center text-foreground">
            What's Included in the Transition Navigator
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {includedFeatures.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0" />
                <div>
                  <h4 className="font-medium text-foreground mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="text-lg px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 btn-editorial shadow-warm"
            >
              {isAuthenticated
                ? "Open Transition Navigator"
                : "Get Started Free"}
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              {isAuthenticated
                ? "Enable in your settings to see the countdown in your navigation"
                : "No credit card required - start planning your adventure today"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TransitionNavigatorFeature;
