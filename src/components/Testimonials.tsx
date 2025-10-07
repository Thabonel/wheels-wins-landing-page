import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const Testimonials = () => {
  const { t } = useTranslation();

  const testimonials = [{
    name: t('testimonials2.margaret.name'),
    location: t('testimonials2.margaret.location'),
    quote: t('testimonials2.margaret.quote')
  }, {
    name: t('testimonials2.robert_linda.name'),
    location: t('testimonials2.robert_linda.location'),
    quote: t('testimonials2.robert_linda.quote')
  }, {
    name: t('testimonials2.james.name'),
    location: t('testimonials2.james.location'),
    quote: t('testimonials2.james.quote')
  }];

  return <section className="py-20 bg-transparent">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
          {t('testimonials2.title')}
        </h2>

        <p className="text-xl text-center mb-16 max-w-3xl mx-auto text-muted-foreground">
          {t('testimonials2.subtitle')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => <Card key={index} className="bg-muted/20 border-primary/10 shadow-md">
              <CardContent className="pt-6">
                <p className="text-lg mb-6 italic">"{testimonial.quote}"</p>
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-muted-foreground">{testimonial.location}</p>
              </CardContent>
            </Card>)}
        </div>
      </div>
    </section>;
};
export default Testimonials;