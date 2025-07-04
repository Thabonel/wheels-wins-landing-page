#!/bin/bash
echo "Restoring original hero image and header settings..."

# Fix publicAssets.ts to use Supabase
cat > src/utils/publicAssets.ts << 'ASSETS_EOF'
export function getPublicAssetUrl(file: string): string {
  return `https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/${file}`;
}
ASSETS_EOF

# Fix Hero.tsx positioning
cat > src/components/Hero.tsx << 'HERO_EOF'
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getPublicAssetUrl } from "@/utils/publicAssets";

const Hero = () => {
  return (
    <section className="w-full h-screen flex items-center justify-center overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('${getPublicAssetUrl('WheelsnadwinsHero.jpg')}')` }}
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">
          The Traveller's Guide to Roadside Riches
        </h1>
        <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto">
          Discover the Freedom of the Open Road with Expert Resources Designed for Mature Travelers. Meet Pam, Your Smart Travel Companion. Pam is your AI assistant who helps you plan your trip, manage your money, and help you stay stress-free on the road.
        </p>
        <Link to="/signup">
          <Button size="lg" className="text-xl font-semibold px-10 py-7 bg-accent text-accent-foreground hover:bg-accent/90">
            Get Pam's Help Free for 30 Days
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default Hero;
HERO_EOF

echo "✅ Original assets restored successfully!"
echo "Your hero image and transparent header should now be working."
