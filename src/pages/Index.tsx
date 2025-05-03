
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import PamSpotlight from "@/components/PamSpotlight";
import HowItWorks from "@/components/HowItWorks";
import FeaturedProduct from "@/components/FeaturedProduct";
import Testimonials from "@/components/Testimonials";
import CallToAction from "@/components/CallToAction";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <Hero />
      <PamSpotlight />
      <HowItWorks />
      <FeaturedProduct />
      <Testimonials />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default Index;
