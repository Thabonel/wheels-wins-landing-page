import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="w-full h-screen flex items-start justify-center overflow-hidden pt-32">
      <div className="absolute inset-0 bg-cover bg-center" style={{
        backgroundImage: `url('/images/hero-unimog-fire.jpg')`
      }}>
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
          Plan RV Trips That Save Money—Not Waste It
        </h1>
        <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto">
          AI-powered route planning + expense tracking for full-time RVers who want more travel, less stress.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to="/signup">
            <Button size="lg" className="text-xl font-semibold px-10 py-7 bg-accent text-accent-foreground hover:bg-accent/90">
              Start Free for 30 Days
            </Button>
          </Link>
          <Link to="/demo">
            <Button size="lg" variant="outline" className="text-xl font-semibold px-10 py-7 bg-white/10 text-white border-white/30 hover:bg-white/20">
              Watch How It Works
            </Button>
          </Link>
        </div>
        <p className="text-white/80 mt-6 text-sm">
          Join 10,000+ RV travelers
        </p>
      </div>
    </section>
  );
};

export default Hero;