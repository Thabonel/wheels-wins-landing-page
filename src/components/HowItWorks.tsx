import { Calendar, DollarSign, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const HowItWorks = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Calendar className="w-12 h-12 text-primary" />,
      title: t('howitworks.plan_your_trip'),
      description: t('howitworks.professionalgrade_route_planni')
    },
    {
      icon: <DollarSign className="w-12 h-12 text-primary" />,
      title: t('howitworks.financial_security'),
      description: t('howitworks.track_every_expense_and_mainta')
    },
    {
      icon: <MessageSquare className="w-12 h-12 text-primary" />,
      title: t('howitworks.worklife_balance'),
      description: t('howitworks.connect_with_reliable_workspac')
    },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          {t('howitworks.title')}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-none shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 text-center">
                <div className="flex justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
