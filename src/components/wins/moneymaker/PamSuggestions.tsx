
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PamSuggestions() {
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
          <span>Pam's Money-Making Suggestions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-white rounded-lg border border-blue-100">
          <p className="text-blue-900 font-medium">
            Your Etsy store is growing 70% faster than your other income sources! Want to spend more time on it?
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Button size="sm" className="bg-blue-500 hover:bg-blue-600">Show Me How</Button>
            <Button size="sm" variant="outline">Later</Button>
          </div>
        </div>
        
        <div className="p-3 bg-white rounded-lg border border-blue-100">
          <p className="text-blue-900 font-medium">
            3 income ideas that are working for travelers with profiles like yours:
          </p>
          <ul className="mt-2 space-y-2 text-sm list-disc pl-5">
            <li><span className="font-medium">Remote bookkeeping</span> - Average $950/month, 20hrs/week</li>
            <li><span className="font-medium">RV inspections</span> - Average $400/month, flexible schedule</li>
            <li><span className="font-medium">Campground photography</span> - Average $300/month, combines with travel</li>
          </ul>
        </div>
        
        <div className="p-3 bg-white rounded-lg border border-blue-100">
          <p className="text-blue-900 font-medium">
            Your YouTube channel could use some attention - views dropped 32% this month
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Consider scheduling a batch recording day when you reach an area with good internet.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
