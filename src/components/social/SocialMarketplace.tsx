import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Heart, MapPin, Clock, Filter, Star, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import CreateListingForm from "./marketplace/CreateListingForm";
import FilterModal, { FilterOptions } from "./marketplace/FilterModal";
interface MarketplaceListing {
  id: string;
  title: string;
  price: number;
  image?: string;
  seller: string;
  location: string;
  category: string;
  condition: string;
  description: string;
  posted: string;
  is_favorite?: boolean;
  status: string;
}
export default function SocialMarketplace() {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({});
  const { user } = useAuth();
  const categories = ["all", "Electronics", "Furniture", "Parts", "Camping", "Tools", "Other"];
  useEffect(() => {
    fetchListings();
    if (user) {
      fetchFavorites();
    }
  }, [user]);

  useEffect(() => {
    filterListings();
  }, [listings, searchTerm, selectedCategory, activeFilters]);
  const fetchFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_wishlists')
        .select('listing_id')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Error fetching favorites:', error);
        return;
      }
      
      setFavorites(new Set(data?.map(f => f.listing_id) || []));
    } catch (err) {
      console.error('Error in fetchFavorites:', err);
    }
  };

  const fetchListings = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('marketplace_listings').select('*').eq('status', 'active').order('created_at', {
        ascending: false
      });
      if (error) {
        console.error('Error fetching marketplace listings:', error);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        
        // Only show error toast for actual errors, not empty data
        if (error.code === 'PGRST116') {
          // Table not found
          console.log('Marketplace listings table not found');
          setListings([]);
        } else if (error.code === 'PGRST301') {
          // No rows found - this is fine, just empty data
          console.log('No marketplace listings found - showing empty state');
          setListings([]);
        } else {
          // Actual error
          toast.error('Failed to load marketplace listings');
        }
        return;
      }
      
      // Set data or empty array
      setListings(data || []);
      
      // Log for debugging
      console.log(`Loaded ${(data || []).length} marketplace listings`);
    } catch (err) {
      console.error('Error in fetchListings:', err);
      toast.error('Something went wrong loading listings');
    } finally {
      setIsLoading(false);
    }
  };
  const filterListings = () => {
    let filtered = listings;

    // Text search
    if (searchTerm) {
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        listing.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(listing => listing.category === selectedCategory);
    }

    // Advanced filters
    if (activeFilters.minPrice !== undefined) {
      filtered = filtered.filter(listing => listing.price >= activeFilters.minPrice!);
    }
    
    if (activeFilters.maxPrice !== undefined) {
      filtered = filtered.filter(listing => listing.price <= activeFilters.maxPrice!);
    }
    
    if (activeFilters.condition) {
      filtered = filtered.filter(listing => listing.condition === activeFilters.condition);
    }
    
    if (activeFilters.category) {
      filtered = filtered.filter(listing => listing.category === activeFilters.category);
    }
    
    if (activeFilters.location) {
      filtered = filtered.filter(listing => 
        listing.location.toLowerCase().includes(activeFilters.location!.toLowerCase())
      );
    }

    setFilteredListings(filtered);
  };
  const toggleFavorite = async (listingId: string) => {
    if (!user) {
      toast.error('Please login to save favorites');
      return;
    }

    try {
      const isFavorited = favorites.has(listingId);
      
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('user_wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
        
        if (error) {
          console.error('Error removing favorite:', error);
          toast.error('Failed to remove from favorites');
          return;
        }
        
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.delete(listingId);
          return newSet;
        });
        toast.success('Removed from favorites');
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('user_wishlists')
          .insert({
            user_id: user.id,
            listing_id: listingId
          });
        
        if (error) {
          console.error('Error adding favorite:', error);
          toast.error('Failed to add to favorites');
          return;
        }
        
        setFavorites(prev => {
          const newSet = new Set(prev);
          newSet.add(listingId);
          return newSet;
        });
        toast.success('Added to favorites');
      }
    } catch (err) {
      console.error('Error in toggleFavorite:', err);
      toast.error('Something went wrong');
    }
  };

  const handleContactSeller = (listing: MarketplaceListing) => {
    const subject = encodeURIComponent(`Interested in: ${listing.title}`);
    const body = encodeURIComponent(`Hi ${listing.seller},\n\nI'm interested in your listing "${listing.title}" for $${listing.price}.\n\nPlease let me know if it's still available.\n\nThanks!`);
    
    // Try to open default email client
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast.success('Opening email client...');
  };

  const handleAdvancedFilter = () => {
    setShowFilterModal(true);
  };

  const handleApplyFilters = (filters: FilterOptions) => {
    setActiveFilters(filters);
  };
  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  if (isLoading) {
    return <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading marketplace...</p>
      </div>;
  }
  return <div className="space-y-6">
      <div className="text-center mb-6">
        
        <p className="text-muted-foreground">
          Buy and sell items with fellow travelers
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
          <Input placeholder="Search marketplace..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        
        <div className="flex gap-2">
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white">
            {categories.map(category => <option key={category} value={category}>
                {category === "all" ? "All Categories" : category}
              </option>)}
          </select>
          
          <Button variant="outline" size="sm" onClick={handleAdvancedFilter}>
            <Filter size={16} className="mr-1" />
            Filter
          </Button>
        </div>
      </div>

      {filteredListings.length === 0 ? <Card className="text-center py-8">
          <CardContent>
            {searchTerm || selectedCategory !== "all" ? <>
                <p className="text-muted-foreground">No listings match your search criteria.</p>
                <Button variant="outline" onClick={() => {
            setSearchTerm("");
            setSelectedCategory("all");
          }} className="mt-2">
                  Clear Filters
                </Button>
              </> : <>
                <p className="text-muted-foreground">No marketplace listings available yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Be the first to list an item for sale!
                </p>
              </>}
          </CardContent>
        </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map(listing => <Card key={listing.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-video bg-muted relative">
                {listing.image ? <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No Image
                  </div>}
                
                <Button variant="ghost" size="sm" className="absolute top-2 right-2 bg-white/80 hover:bg-white" onClick={() => toggleFavorite(listing.id)}>
                  <Heart size={16} className={favorites.has(listing.id) ? "fill-current text-red-500" : ""} />
                </Button>
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{listing.title}</CardTitle>
                  <div className="text-right">
                    <div className="text-xl font-bold text-green-600">
                      ${listing.price.toFixed(2)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin size={14} />
                  {listing.location}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {listing.description}
                </p>

                <div className="flex items-center justify-between mb-3">
                  <Badge className={getConditionColor(listing.condition)}>
                    {listing.condition}
                  </Badge>
                  <Badge variant="outline">{listing.category}</Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Clock size={14} className="mr-1" />
                    {listing.posted}
                  </div>
                  <div className="font-medium">
                    by {listing.seller}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button className="flex-1" size="sm" onClick={() => handleContactSeller(listing)}>
                    Contact Seller
                  </Button>
                  <Button variant="outline" size="sm">
                    <Star size={14} />
                  </Button>
                </div>
              </CardContent>
            </Card>)}
        </div>}

      <Card className="bg-gradient-to-r from-green-50 to-blue-50 border-dashed">
        <CardContent className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2">Got Something to Sell?</h3>
          <p className="text-muted-foreground mb-4">
            List your items and connect with fellow travelers
          </p>
          <Button onClick={() => setShowCreateModal(true)}>Create Listing</Button>
        </CardContent>
      </Card>

      {/* Create Listing Modal */}
      <CreateListingForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onListingCreated={fetchListings}
      />

      {/* Filter Modal */}
      <FilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApplyFilters={handleApplyFilters}
        currentFilters={activeFilters}
      />
    </div>;
}