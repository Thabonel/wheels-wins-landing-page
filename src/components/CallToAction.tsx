
import { Button } from "@/components/ui/button";

const CallToAction = () => {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Ready to Start Your Adventure?
        </h2>
        
        <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto opacity-90">
          Join thousands of travelers enjoying smarter, more connected journeys.
        </p>
        
        <Button 
          size="lg" 
          className="text-xl font-semibold px-10 py-7 bg-accent text-accent-foreground hover:bg-accent/90"
        >
          Join Now – First Month Free
        </Button>
        
        <p className="mt-6 text-lg opacity-80">
          No credit card required. Cancel anytime.
        </p>
      </div>
    </section>
  );
};

export default CallToAction;
