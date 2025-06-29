import { Button } from "@/components/ui/button";
import { getPublicAssetUrl } from "@/utils/publicAssets";

const PamSpotlight = () => {
  return (
    <section className="py-8 bg-white">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="w-full md:w-1/2 order-2 md:order-1">
            <img
              src={getPublicAssetUrl('Pam.webp')}
              alt="Pam AI Assistant"
              className="rounded-2xl shadow-lg w-full max-w-md mx-auto"
            />
          </div>

          <div className="w-full md:w-1/2 order-1 md:order-2">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary">
              Pam Handles the Details — You Enjoy the Journey
            </h2>

            <p className="text-xl mb-8 text-gray-700">
              Let Pam handle the details—route planning, expense tracking, and traveler meetups—so you can focus on the journey.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PamSpotlight;
