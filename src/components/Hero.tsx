import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getPublicAssetUrl } from "@/utils/publicAssets";
const Hero = () => {
  return <section className="w-full h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center" style={{
      backgroundImage: `url('${getPublicAssetUrl('WheelsnadwinsHero.jpg')}')`
    }}>
        <div className="absolute inset-0 bg-black/40" />
      </div>
      <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-lg">Your Complete RV Companion
Plan, Budget &amp; Connect</h1>
        <p className="text-xl md:text-2xl text-white/90 mb-10 max-w-3xl mx-auto">
          Whether you're a seasoned snowbird, a remote-working family, or planning retirement on the road, Pam keeps your trips organized and affordable.
        </p>
        <Link to="/signup">
          <Button size="lg" className="text-xl font-semibold px-10 py-7 bg-accent text-accent-foreground hover:bg-accent/90">
            Get Pam's Help Free for 30 Days
          </Button>
        </Link>
      </div>
    </section>;
};
export default Hero;