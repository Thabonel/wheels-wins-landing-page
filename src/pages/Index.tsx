// src/pages/Index.tsx
import PamSpotlight from "@/components/PamSpotlight";
import HowItWorks from "@/components/HowItWorks";
import FeaturedProduct from "@/components/FeaturedProduct";
import Testimonials from "@/components/Testimonials";
import CallToAction from "@/components/CallToAction";
import PricingPlans from "@/components/PricingPlans";

const Index = () => {
  return (
    <div className="pt-0">
      {/* Hero removed here; Layout will render it full-width */}
      <PamSpotlight />
      <HowItWorks />
      <FeaturedProduct />
      <PricingPlans />
      <Testimonials />
      <CallToAction />
    </div>
  );
};

export default Index;
