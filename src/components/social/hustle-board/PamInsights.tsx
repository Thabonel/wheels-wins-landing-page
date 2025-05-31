
import { Badge } from "@/components/ui/badge";

export default function PamInsights() {
  return (
    <div className="bg-purple-50 p-6 rounded-lg mb-6">
      <h2 className="text-xl font-bold mb-2">Pam's Hustle Insights</h2>
      <p className="text-gray-700 mb-4">
        Based on recent community activity, these hustle types are trending:
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        <Badge className="bg-purple-600 text-white px-3 py-1">Campground hosting</Badge>
        <Badge className="bg-green-600 text-white px-3 py-1">RV repairs</Badge>
        <Badge className="bg-blue-600 text-white px-3 py-1">Online consulting</Badge>
        <Badge className="bg-orange-600 text-white px-3 py-1">Destination photography</Badge>
      </div>
      <p className="text-gray-700">
        <span className="font-semibold">Pam's tip:</span> Seasonal opportunities are opening up for the winter in southern states!
      </p>
    </div>
  );
}
