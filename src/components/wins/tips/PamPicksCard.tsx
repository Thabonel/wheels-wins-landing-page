
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getPublicAssetUrl } from "@/utils/publicAssets";

export default function PamPicksCard() {
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
          <span>Pam's Picks For You</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-blue-900 mb-4">
          Based on your travel patterns, these tips could save you the most money right now:
        </p>
        <div className="space-y-3">
          <div className="p-3 bg-white rounded-lg border border-blue-100">
            <div className="font-medium text-blue-900">Try the 2-2-2 Rule for Travel Days</div>
            <p className="text-muted-foreground text-sm mt-1">
              Drive no more than 200 miles, arrive by 2 PM, and stay at least 2 nights. 
              This reduces fuel consumption, stress, and helps you avoid premium-priced overnight stops.
            </p>
          </div>
          
          <div className="p-3 bg-white rounded-lg border border-blue-100">
            <div className="font-medium text-blue-900">National Forest Camping Near Moab</div>
            <p className="text-muted-foreground text-sm mt-1">
              Since you're headed to Utah next week, consider staying at Ken's Lake campground. 
              It's just 15 minutes from town with $20/night sites instead of $45+ at commercial campgrounds.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
