
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPublicAssetUrl } from "@/utils/publicAssets";

export default function PamInsightCard() {
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-blue-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="bg-blue-100 p-1 rounded-full">
            <img
              src={getPublicAssetUrl('Pam.webp')}
              alt="Pam"
              className="h-5 w-5 rounded-full"
            />
          </span>
          <span>Pam's Income Insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-blue-900">
          Your freelance income is growing steadily! Based on your current trajectory, 
          you could increase your revenue by focusing more on design work, 
          which earns you 3x more per hour than your other gigs.
        </p>
      </CardContent>
    </Card>
  );
}
