import { Button } from "@/components/ui/button";
const Hero = () => {
  return <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-hero-pattern bg-cover bg-center">
        <div className="absolute inset-0 bg-transparent"></div>
      </div>
      
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-24 text-center mt-16">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
          Adventure Smarter with Wheels and Wins
        </h1>
        
        <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto">
          Track your money. Plan your journey. Get help from Pam — your AI travel companion.
        </p>
        
        <Button className="text-xl font-semibold px-10 py-7 bg-accent hover:bg-accent/90 animate-float" size="lg">
          Join Now – First Month Free
        </Button>
      </div>
    </section>;
};
export default Hero;