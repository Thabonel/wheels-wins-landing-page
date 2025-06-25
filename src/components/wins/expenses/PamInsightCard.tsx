
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface PamInsightCardProps {
  title?: string;
  content: string;
}

export default function PamInsightCard({ 
  title = "Pam's Expense Insights", 
  content 
}: PamInsightCardProps) {
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-blue-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="bg-blue-100 p-1 rounded-full">
            <img
              src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp"
              alt="Pam"
              className="h-5 w-5 rounded-full"
            />
          </span>
          <span>{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-blue-900">
          {content}
        </p>
      </CardContent>
    </Card>
  );
}
