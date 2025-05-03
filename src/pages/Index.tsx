
import Hero from "@/components/Hero";
import PamSpotlight from "@/components/PamSpotlight";
import HowItWorks from "@/components/HowItWorks";
import FeaturedProduct from "@/components/FeaturedProduct";
import Testimonials from "@/components/Testimonials";
import CallToAction from "@/components/CallToAction";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Hero />
      <PamSpotlight />
      <HowItWorks />
      <FeaturedProduct />
      <Testimonials />
      <CallToAction />
    </div>
  );
};

export default Index;
