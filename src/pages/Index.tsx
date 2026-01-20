// src/pages/Index.tsx
import PamSpotlight from "@/components/PamSpotlight";
import TransitionNavigatorFeature from "@/components/TransitionNavigatorFeature";
import HowItWorks from "@/components/HowItWorks";
import FeatureTour from "@/components/FeatureTour";
import FeaturedProduct from "@/components/FeaturedProduct";
import Testimonials from "@/components/Testimonials";
import CallToAction from "@/components/CallToAction";
import PricingPlans from "@/components/PricingPlans";
import FAQ from "@/components/FAQ";

const Index = () => {
  return (
    <div className="pt-0">
      {/* Hero removed here; Layout will render it full-width */}
      <PamSpotlight />
      <TransitionNavigatorFeature />
      <HowItWorks />
      <FeatureTour />
      <FeaturedProduct />
      <PricingPlans />
      <FAQ />
      <Testimonials />
      <CallToAction />
    </div>
  );
};

export default Index;
