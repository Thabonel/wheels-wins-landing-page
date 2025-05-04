
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Search, ShoppingBag, MapPin, ExternalLink, Clock, Filter, ListFilter, LayoutGrid
} from "lucide-react";
import { useSocialData } from "@/components/social/useSocialData";

export default function SocialMarketplace() {
  const { listings } = useSocialData();
  const [searchQuery, setSearchQuery] = useState("");
  const [distanceRange, setDistanceRange] = useState([100]);
  const [meetHalfway, setMeetHalfway] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  const handleContactSeller = (listingId: number) => {
    toast.info("Chat feature coming soon!");
  };

  const filteredListings = listings.filter(listing => {
    // Filter by search query
    if (searchQuery && !listing.title.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by distance
    if (listing.distance > distanceRange[0]) {
      return false;
    }
    
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Marketplace search and filters */}
      <div className="bg-blue-50 p-6 rounded-lg">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              placeholder="Search for items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline"
              size="icon"
              onClick={() => setViewMode("grid")}
              className={viewMode === "grid" ? "bg-blue-100" : ""}
            >
              <LayoutGrid size={18} />
            </Button>
            <Button 
              variant="outline"
              size="icon"
              onClick={() => setViewMode("list")}
              className={viewMode === "list" ? "bg-blue-100" : ""}
            >
              <ListFilter size={18} />
            </Button>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Distance: {distanceRange[0]} km
            </label>
            <Slider 
              defaultValue={[100]} 
              max={500} 
              step={10}
              value={distanceRange}
              onValueChange={setDistanceRange}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Meet Halfway</label>
            <Switch 
              checked={meetHalfway} 
              onCheckedChange={setMeetHalfway} 
            />
          </div>
        </div>
      </div>
      
      {/* Pam's picks */}
      <div className="bg-green-50 p-6 rounded-lg">
        <h2 className="text-xl font-bold mb-4">Pam's Picks</h2>
        <p className="text-gray-700 mb-4">
          These items match your recent searches and RV profile:
        </p>
        {/* We'd show Pam's recommended listings here */}
      </div>
      
      {/* Marketplace listings */}
      <div>
        <h3 className="text-xl font-semibold mb-6">
          {filteredListings.length} Available Items
        </h3>
        
        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden flex flex-col h-full">
                <div className="h-44 overflow-hidden">
                  <img 
                    src={listing.image} 
                    alt={listing.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between">
                    <h4 className="font-semibold">{listing.title}</h4>
                    <Badge>${listing.price}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2 flex-grow">
                  <p className="text-sm text-gray-700 line-clamp-2 mb-2">
                    {listing.description}
                  </p>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin size={16} className="mr-1" /> {listing.distance} km away
                    {meetHalfway && (
                      <Badge className="ml-2 text-xs bg-blue-400">Can meet halfway</Badge>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <Clock size={14} className="mr-1" /> Listed {listing.listedDays} days ago
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button 
                    className="w-full"
                    onClick={() => handleContactSeller(listing.id)}
                  >
                    Contact Seller
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredListings.map((listing) => (
              <Card key={listing.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-48 h-40">
                    <img 
                      src={listing.image} 
                      alt={listing.title} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-grow p-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">{listing.title}</h4>
                      <Badge>${listing.price}</Badge>
                    </div>
                    <p className="text-sm text-gray-700 my-2">
                      {listing.description}
                    </p>
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin size={16} className="mr-1" /> {listing.distance} km away
                      {meetHalfway && (
                        <Badge className="ml-2 text-xs bg-blue-400">Can meet halfway</Badge>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1 mb-4">
                      <Clock size={14} className="mr-1" /> Listed {listing.listedDays} days ago
                    </div>
                    <Button 
                      onClick={() => handleContactSeller(listing.id)}
                      size="sm"
                    >
                      Contact Seller
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Create Listing Banner */}
      <Card className="bg-gray-50 border-dashed border-2 border-gray-300 p-6 text-center">
        <CardContent>
          <h4 className="text-lg font-semibold">Have something to sell?</h4>
          <p className="text-gray-700 mb-4">
            List your items securely in the marketplace for other travelers to find.
          </p>
          <Button>
            <ShoppingBag size={18} className="mr-2" /> Create Listing
          </Button>
        </CardContent>
      </Card>
      
      <div className="text-sm text-gray-500">
        <p>• All listings require admin approval before appearing in the marketplace</p>
        <p>• Listings automatically expire after 30 days unless renewed</p>
        <p>• For your safety, never share personal contact information outside our secure chat</p>
      </div>
    </div>
  );
}
