
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function PamInsightCard() {
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
          <span>Pam's Expense Insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-blue-900">
          Your fuel costs are 23% higher than last month. 
          I found three gas stations nearby with prices $0.30 lower than you've been paying.
          Want me to show you the route?
        </p>
      </CardContent>
    </Card>
  );
}
