import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Video } from "lucide-react";
import { useTranslation } from "react-i18next";

const FeaturedProduct = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20 bg-white">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="border-2 border-accent/20 bg-accent/5 overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/4 flex justify-center">
                <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center">
                  <Video className="w-12 h-12 text-accent-foreground" />
                </div>
              </div>

              <div className="w-full md:w-3/4">
                <h2 className="text-2xl md:text-3xl font-bold mb-3">
                  {t('featuredproduct.title')}
                </h2>

                <p className="text-lg mb-6">
                  {t('featuredproduct.description')}
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <span className="text-2xl font-bold text-primary">{t('featuredproduct.price')}</span>
                  <Button
                    className="font-semibold"
                    size="lg"
                    onClick={() => window.open('https://videocourse.wheelsandwins.com', '_blank')}
                  >
                    {t('featuredproduct.button')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default FeaturedProduct;
