import { getPublicAssetUrl } from "@/utils/publicAssets";
import { MapPin, DollarSign, Users, Sparkles } from "lucide-react";

const PamSpotlight = () => {
  const features = [
    { icon: MapPin, label: "Route Planning" },
    { icon: DollarSign, label: "Budget Tracking" },
    { icon: Users, label: "Community Connect" },
    { icon: Sparkles, label: "Smart Suggestions" },
  ];

  return (
    <section className="py-20 md:py-28 bg-card relative overflow-hidden">
      {/* Subtle paper texture background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

      <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Image side - organic blob shape */}
          <div className="w-full lg:w-5/12 order-2 lg:order-1">
            <div className="relative">
              {/* Decorative blob shape behind image */}
              <svg
                className="absolute -inset-4 w-[calc(100%+2rem)] h-[calc(100%+2rem)] text-secondary/20"
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="currentColor"
                  d="M47.1,-57.2C59.5,-47.3,67.1,-31.3,70.2,-14.4C73.3,2.6,71.9,20.4,63.8,34.3C55.7,48.2,40.9,58.1,24.6,64.1C8.3,70.1,-9.5,72.1,-26.3,68.1C-43.1,64.1,-58.9,54,-67.3,39.7C-75.7,25.4,-76.7,6.9,-72.3,-9.3C-67.9,-25.5,-58.1,-39.4,-45.1,-49.2C-32.1,-59,-16,-64.7,0.8,-65.7C17.7,-66.7,35.4,-62.9,47.1,-57.2Z"
                  transform="translate(100 100)"
                />
              </svg>

              {/* Image container with organic border */}
              <div className="relative rounded-[2rem] overflow-hidden shadow-warm-lg border-4 border-card">
                <img
                  src={getPublicAssetUrl("Pam.webp")}
                  alt="Pam AI Assistant"
                  className="w-full h-auto object-cover aspect-square"
                />
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent" />
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 md:-right-8 bg-background rounded-xl px-4 py-3 shadow-warm-lg border border-border animate-float">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-accent-foreground" />
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    AI-Powered
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Content side */}
          <div className="w-full lg:w-7/12 order-1 lg:order-2">
            {/* Decorative quotation mark */}
            <div className="mb-4 opacity-20">
              <svg
                className="w-12 h-12 text-primary"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
              </svg>
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-light tracking-tight text-foreground mb-6">
              Meet <span className="font-medium text-primary">Pam</span> - Your
              AI Travel Companion
            </h2>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8">
              Pam handles the details so you can live the dream. She plans
              routes, tracks your budget, and connects you with like-minded
              travelers - all while learning your preferences to make every trip
              better than the last.
            </p>

            {/* Feature badges */}
            <div className="flex flex-wrap gap-3 mb-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50 text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted hover:border-border"
                  >
                    <Icon className="w-4 h-4 text-secondary" />
                    {feature.label}
                  </div>
                );
              })}
            </div>

            {/* Quote highlight */}
            <div className="relative pl-6 border-l-2 border-accent">
              <p className="text-base italic text-muted-foreground">
                "Like having a knowledgeable friend who's always got your back
                on the road"
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PamSpotlight;
