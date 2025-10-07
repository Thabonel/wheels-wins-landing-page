import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const Features = () => {
  const { t } = useTranslation();

  const features = [{
    title: t('landing.features.track_budget.title'),
    description: t('landing.features.track_budget.description')
  }, {
    title: t('landing.features.plan_routes.title'),
    description: t('landing.features.plan_routes.description')
  }, {
    title: t('landing.features.connect_travelers.title'),
    description: t('landing.features.connect_travelers.description')
  }, {
    title: t('landing.features.ai_companion.title'),
    description: t('landing.features.ai_companion.description')
  }];

  return <section className="py-20 bg-transparent">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          {t('landing.features.title')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => <Card key={index} className="border-2 border-primary/10 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-center">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground text-lg">{feature.description}</p>
              </CardContent>
            </Card>)}
        </div>
      </div>
    </section>;
};
export default Features;