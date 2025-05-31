
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

export default function SubmitIdeaCard() {
  return (
    <Card className="bg-gray-50 border-dashed border-2 border-gray-300 p-6 text-center">
      <CardContent>
        <h4 className="text-lg font-semibold">Have a money-making idea to share?</h4>
        <p className="text-gray-700 mb-4">Help other travelers find new income sources while on the road!</p>
        <Button>
          <TrendingUp size={18} className="mr-2" /> Submit Your Idea
        </Button>
      </CardContent>
    </Card>
  );
}
