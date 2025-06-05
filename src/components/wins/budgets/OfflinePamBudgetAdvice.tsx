
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCachedBudgetData } from "@/hooks/useCachedBudgetData";

export default function OfflinePamBudgetAdvice() {
  const { cachedData } = useCachedBudgetData();

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
          <span>Pam's Cached Budget Tips</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          While you're offline, here are your last saved budget tips:
        </p>
        <div className="space-y-3">
          {cachedData.pamTips.map((tip, index) => (
            <div key={index} className="p-3 bg-white rounded-lg border border-blue-100">
              <p className="text-sm text-blue-900">{tip}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Last updated: {new Date(cachedData.timestamp).toLocaleDateString()}
        </p>
      </CardContent>
    </Card>
  );
}
