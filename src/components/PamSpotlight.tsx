import { Button } from "@/components/ui/button";
const PamSpotlight = () => {
  return <section className="py-20 bg-white">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="w-full md:w-1/2 order-2 md:order-1">
            <img src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//Pam.webp" alt="Pam AI Assistant" className="rounded-2xl shadow-lg w-full max-w-md mx-auto" />
          </div>
          
          <div className="w-full md:w-1/2 order-1 md:order-2">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary">
              Pam Handles the Details — You Enjoy the Journey
            </h2>
            
            <p className="text-xl mb-8 text-gray-700">
              Planning where to stay? Tracking your budget? Finding the best stops?
              Pam does it all — just chat and go. She keeps your life running smoothly so you can focus on the fun.
            </p>
            
            
          </div>
        </div>
      </div>
    </section>;
};
export default PamSpotlight;