
import { Calendar, DollarSign, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: <Calendar className="w-12 h-12 text-primary" />,
    title: "Plan Your Trip",
    description: "Professional-grade route planning to avoid costly mistakes"
  },
  {
    icon: <DollarSign className="w-12 h-12 text-primary" />,
    title: "Financial Security",
    description: "Track every expense and maintain budget confidence"
  },
  {
    icon: <MessageSquare className="w-12 h-12 text-primary" />,
    title: "Work-Life Balance",
    description: "Connect with reliable workspaces and supportive communities"
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          How It Works
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
