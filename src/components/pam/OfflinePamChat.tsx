
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff } from "lucide-react";
import { useCachedPamTips } from "@/hooks/useCachedPamTips";

export default function OfflinePamChat() {
  const { cachedTips } = useCachedPamTips();

  return (
    <Card className="bg-gray-50 border-gray-200">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-gray-600">
          <WifiOff className="h-5 w-5" />
          <span>Pam is offline. Showing your last saved tips.</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {cachedTips.map((tip, index) => (
          <div key={tip.id} className="p-3 bg-white rounded-lg border border-gray-100">
            <p className="text-sm text-gray-800">{tip.content}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(tip.timestamp).toLocaleDateString()}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
