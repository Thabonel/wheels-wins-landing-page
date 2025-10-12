import { Map, DollarSign, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const HowItWorks = () => {
  const features = [
    {
      icon: <Users className="w-12 h-12 text-primary" />,
      title: "💬 Community that Travels With You",
      description: "Stay connected with other nomads — share tips, meet up on the road, and always have friends nearby."
    },
    {
      icon: <DollarSign className="w-12 h-12 text-primary" />,
      title: "💰 Confidence in Every Dollar",
      description: "Let Pam track your expenses, find savings, and keep your adventures sustainable."
    },
    {
      icon: <Map className="w-12 h-12 text-primary" />,
      title: "🗺️ Smarter Route Planning",
      description: "Avoid mistakes, plan scenic routes, and find hidden gems tailored to your travel style."
    },
  ];

  return (
    <section className="py-20 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          What Makes Wheels and Wins Different
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
