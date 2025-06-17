import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Heart, Star, MapPin, Calendar, Filter, Search, PlusCircle } from "lucide-react";
import { useSocialData } from "@/components/social/useSocialData";

export default function SocialMarketplace() {
  const { marketplaceListings = [] } = useSocialData();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [favorites, setFavorites] = useState<number[]>([]);

  const categories = ["all", "RV Parts", "Camping Gear", "Electronics", "Tools", "Books", "Clothing"];
  const priceRanges = ["all", "Under $50", "$50-$200", "$200-$500", "Over $500"];

  const toggleFavorite = (listingId: number) => {
    setFavorites(prev => 
      prev.includes(listingId) 
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    );
  };

  const handleContactSeller = (listingId: number) => {
    toast.info("Contact seller feature coming soon!");
  };

  const getFilteredListings = () => {
    return marketplaceListings.filter(listing => {
      const matchesSearch = !searchQuery || 
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || listing.category === selectedCategory;
      
      const matchesPrice = priceRange === "all" || (() => {
        switch (priceRange) {
          case "Under $50":
            return listing.price < 50;
          case "$50-$200":
            return listing.price >= 50 && listing.price <= 200;
          case "$200-$500":
            return listing.price >= 200 && listing.price <= 500;
          case "Over $500":
            return listing.price > 500;
          default:
            return true;
        }
      })();

      return matchesSearch && matchesCategory && matchesPrice;
    });
  };

  const filteredListings = getFilteredListings();

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 p-6 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-2">Pam's Marketplace Tips</h2>
        <p className="text-gray-700 mb-4">
          Here are some tips for buying and selling in the marketplace:
        </p>
        <ul className="list-disc list-inside text-gray-700 mb-4">
          <li>Always inspect items in person if possible</li>
          <li>Use secure payment methods</li>
          <li>Check seller ratings and reviews</li>
          <li>Be clear about shipping costs and return policies</li>
        </ul>
        <p className="text-gray-700">
          <span className="font-semibold">Pam's tip:</span> Negotiate prices respectfully and always be honest in your listings!
        </p>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search marketplace..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2"
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category === "all" ? "All Categories" : category}
            </option>
          ))}
        </select>
        <select
          value={priceRange}
          onChange={(e) => setPriceRange(e.target.value)}
          className="border border-gray-200 rounded-md px-3 py-2"
        >
          {priceRanges.map(range => (
            <option key={range} value={range}>
              {range === "all" ? "All Prices" : range}
            </option>
          ))}
        </select>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredListings.map((listing) => (
          <Card key={listing.id} className="overflow-hidden">
            <div className="relative">
              <img 
                src={listing.image} 
                alt={listing.title} 
                className="w-full h-48 object-cover"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                onClick={() => toggleFavorite(listing.id)}
              >
                <Heart 
                  size={18} 
                  className={favorites.includes(listing.id) ? "fill-red-500 text-red-500" : "text-gray-600"}
                />
              </Button>
              <Badge className="absolute top-2 left-2 bg-blue-600">
                {listing.condition}
              </Badge>
            </div>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <h4 className="font-semibold text-lg line-clamp-1">{listing.title}</h4>
                <span className="text-xl font-bold text-green-600">${listing.price}</span>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <MapPin size={14} className="mr-1" />
                {listing.location} • <Calendar size={14} className="ml-2 mr-1" /> {listing.posted}
              </div>
              <Badge variant="outline" className="self-start">{listing.category}</Badge>
            </CardHeader>
            <CardContent className="pb-2">
              <p className="text-sm text-gray-700 line-clamp-2">{listing.description}</p>
              <div className="flex items-center mt-2 text-sm text-gray-600">
                <Star size={14} className="mr-1" fill="gold" stroke="gold" />
                <span className="mr-2">4.8</span>
                <span>Seller: {listing.seller}</span>
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

      {filteredListings.length === 0 && (
        <div className="text-center py-10">
          <p className="text-gray-500">No listings found. Try adjusting your search or filters.</p>
        </div>
      )}

      <Card className="bg-gray-50 border-dashed border-2 border-gray-300 p-6 text-center">
        <CardContent>
          <h4 className="text-lg font-semibold">Have something to sell?</h4>
          <p className="text-gray-700 mb-4">List your RV parts, camping gear, or anything else travelers might need!</p>
          <Button>
            <PlusCircle size={18} className="mr-2" /> Create a Listing
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
