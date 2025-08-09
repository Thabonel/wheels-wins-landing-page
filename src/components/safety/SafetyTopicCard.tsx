
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SafetyTopicCardProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const SafetyTopicCard = ({ id, title, description, icon }: SafetyTopicCardProps) => {
  const scrollToTopic = () => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <Card className="hover:shadow-lg transition-shadow h-full w-full box-border">
      <CardHeader className="p-6">
        <div className="flex justify-center mb-4">
          {icon}
        </div>
        <CardTitle className="text-xl text-center break-words">{title}</CardTitle>
        <CardDescription className="text-center text-base break-words">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          className="w-full" 
          onClick={scrollToTopic}
        >
          Learn More
        </Button>
      </CardContent>
    </Card>
  );
};

export default SafetyTopicCard;
