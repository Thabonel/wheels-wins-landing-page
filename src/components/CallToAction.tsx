import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CallToAction = () => {
  return (
    <section className="py-20 md:py-28 bg-primary text-primary-foreground relative overflow-hidden">
      {/* Topographic pattern background */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="topo-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path
                d="M0 50 Q 25 40, 50 50 T 100 50"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
              <path
                d="M0 30 Q 25 20, 50 30 T 100 30"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
              <path
                d="M0 70 Q 25 60, 50 70 T 100 70"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo-pattern)" />
        </svg>
      </div>

      {/* Decorative compass elements */}
      <div className="absolute top-8 left-8 w-16 h-16 border border-primary-foreground/20 rounded-full" />
      <div className="absolute bottom-8 right-8 w-24 h-24 border border-primary-foreground/10 rounded-full" />

      <div className="container max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        {/* Headline */}
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-light tracking-tight mb-6">
          Join the Wheels and Wins{" "}
          <span className="font-medium">Community</span>
        </h2>

        {/* Subtext */}
        <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto opacity-90 leading-relaxed">
          Wherever the road takes you, you're never alone - and Pam's always got your back.
        </p>

        {/* CTA Button - inverted colors */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/signup">
            <Button
              size="lg"
              className="text-lg font-medium px-8 py-6 bg-primary-foreground text-primary hover:bg-primary-foreground/90 btn-editorial"
            >
              Start Free for 30 Days
            </Button>
          </Link>
        </div>

        {/* Trust indicators */}
        <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm opacity-80">
          <span>No credit card required</span>
          <span>-</span>
          <span>Cancel anytime</span>
          <span>-</span>
          <span>Full access for 30 days</span>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
