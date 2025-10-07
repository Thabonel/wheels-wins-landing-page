import { Button } from "@/components/ui/button";
import { getPublicAssetUrl } from "@/utils/publicAssets";
import { useTranslation } from "react-i18next";

const PamSpotlight = () => {
  const { t } = useTranslation();

  return (
    <section className="py-8 bg-white">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="w-full md:w-1/2 order-2 md:order-1">
            <img
              src={getPublicAssetUrl('Pam.webp')}
              alt={t('pamspotlight.imageAlt')}
              className="rounded-2xl shadow-lg w-full max-w-md mx-auto"
            />
          </div>

          <div className="w-full md:w-1/2 order-1 md:order-2">
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-primary">
              {t('pamspotlight.title')}
            </h2>

            <p className="text-xl mb-8 text-gray-700">
              {t('pamspotlight.description')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PamSpotlight;
