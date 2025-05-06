import { Button } from "@/components/ui/button";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//WheelsnadwinsHero.jpg')",
          backgroundPosition: "center",
          backgroundSize: "cover",
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center pt-32 pb-20">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
          Your Smart Travel Companion — Meet Pam
        </h1>

        <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto">
          Pam is your AI assistant who helps you plan your trip, manage your money, and stay stress-free on the road.
        </p>

        <Button className="text-xl font-semibold px-10 py-7 bg-accent text-accent-foreground hover:bg-accent/90" size="lg">
          Get Pam's Help Free for 30 Days
        </Button>
      </div>
    </section>
  );
};

export default Hero;
