
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Tag, Star, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRegion } from "@/context/RegionContext";
import PamAssistant from "@/components/PamAssistant";

export default function Shop() {
  const [activeTab, setActiveTab] = useState("all");
  const isMobile = useIsMobile();
  const { region } = useRegion();
  
  // Mock user data for Pam assistant
  const user = {
    name: "John",
    avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png"
  };
  
  // Product data with region availability
  const affiliateProducts = [
    {
      id: "aff-1",
      title: "Portable Solar Panel Kit",
      description: "Lightweight 100W solar panels perfect for boondocking. Includes charge controller and cables.",
      image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
      externalLink: "https://example.com/solar-panel-kit",
      isPamRecommended: true,
      availableRegions: ["Australia", "New Zealand", "United States", "Canada"]
    },
    {
      id: "aff-2",
      title: "Compact RV Storage System",
      description: "Maximize your storage space with these collapsible containers designed for RVs.",
      image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
      externalLink: "https://example.com/rv-storage",
      availableRegions: ["Australia", "United States", "Canada", "United Kingdom"]
    },
    {
      id: "aff-3",
      title: "Senior-Friendly First Aid Kit",
      description: "Complete medical kit with large-print instructions. Essential for remote travel.",
      image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
      externalLink: "https://example.com/first-aid",
      isPamRecommended: true,
      availableRegions: ["Australia", "New Zealand", "United States", "Canada", "United Kingdom"]
    },
    {
      id: "aff-4",
      title: "Water Filtration System",
      description: "Ensure clean drinking water wherever you travel with this compact filtration system.",
      image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
      externalLink: "https://example.com/water-filter",
      availableRegions: ["Australia", "United States", "Canada"]
    },
  ];
  
  const digitalProducts = [
    {
      id: "dig-1",
      title: "Make Fun Travel Videos",
      description: "Learn to film, edit, and share adventures using just your smartphone.",
      image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
      price: 97,
      currency: region === "Australia" || region === "New Zealand" ? "AUD" : region === "United Kingdom" ? "GBP" : "USD",
      type: "Video Course",
      hasBonus: true,
      availableRegions: ["Australia", "New Zealand", "United States", "Canada", "United Kingdom"]
    },
    {
      id: "dig-2",
      title: "RV Trip Planner Pro",
      description: "Downloadable templates for planning your next road trip with budget estimates.",
      image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
      price: 24.99,
      currency: region === "Australia" || region === "New Zealand" ? "AUD" : region === "United Kingdom" ? "GBP" : "USD",
      type: "Travel Templates",
      availableRegions: ["Australia", "New Zealand", "United States", "Canada"]
    },
    {
      id: "dig-3",
      title: "Snowbird Budget Master",
      description: "Track and optimize your expenses while traveling south for winter.",
      image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
      price: 19.99,
      currency: region === "Australia" || region === "New Zealand" ? "AUD" : region === "United Kingdom" ? "GBP" : "USD",
      type: "Budget Planner",
      availableRegions: ["United States", "Canada"]
    },
    {
      id: "dig-4",
      title: "RV Setup & Breakdown Checklist",
      description: "Never forget a critical step with our comprehensive checklists.",
      image: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/placeholder.svg",
      price: 12.99,
      currency: region === "Australia" || region === "New Zealand" ? "AUD" : region === "United Kingdom" ? "GBP" : "USD",
      type: "Checklists",
      hasBonus: true,
      isNew: true,
      availableRegions: ["Australia", "New Zealand", "United States", "Canada", "United Kingdom"]
    },
  ];
  
  // Filter products based on current region
  const regionFilteredAffiliateProducts = affiliateProducts.filter(
    product => product.availableRegions.includes(region)
  );
  
  const regionFilteredDigitalProducts = digitalProducts.filter(
    product => product.availableRegions.includes(region)
  );
  
  // Combine products for "All" tab
  const allProducts = [...regionFilteredDigitalProducts, ...regionFilteredAffiliateProducts];
  
  // Filter products based on active tab
  const getFilteredProducts = () => {
    switch(activeTab) {
      case "affiliate":
        return regionFilteredAffiliateProducts;
      case "digital":
        return regionFilteredDigitalProducts;
      default:
        return allProducts;
    }
  };
  
  // Handle external link clicks for affiliate products
  const handleExternalLinkClick = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
  // Handle digital product purchases
  const handleBuyProduct = (productId: string) => {
    // In a real implementation, this would initiate the checkout process
    console.log(`Initiating checkout for product: ${productId}`);
    alert("Checkout functionality would be integrated with Stripe in a real implementation.");
  };
  
  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - 75% on desktop */}
        <div className="w-full lg:w-3/4">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Wheels & Wins Shop</h1>
            <p className="text-gray-600">
              Curated products and resources for mature travelers in {region}
            </p>
          </div>
          
          {/* Featured Products Carousel */}
          <div className="mb-8 bg-blue-50 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Star className="text-yellow-500" />
              Top Picks for {region}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allProducts.slice(0, 3).map((product) => (
                <Card key={`featured-${product.id}`} className="border-2 border-blue-100 shadow-sm">
                  <CardContent className="p-4">
                    <div className="font-semibold text-blue-600">Featured</div>
                    <div className="font-medium">{product.title}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          {/* Main Product Tabs */}
          <Tabs 
            defaultValue="all" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full justify-start overflow-x-auto mb-6">
              {isMobile ? (
                <div className="w-full p-2">
                  <select 
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-md py-2 px-3 text-sm"
                  >
                    <option value="all">All Products</option>
                    <option value="digital">Digital Products</option>
                    <option value="affiliate">Affiliate Products</option>
                  </select>
                </div>
              ) : (
                <>
                  <TabsTrigger value="all" className="text-base py-3 px-6">
                    All Products
                  </TabsTrigger>
                  <TabsTrigger value="digital" className="text-base py-3 px-6">
                    Digital Products
                  </TabsTrigger>
                  <TabsTrigger value="affiliate" className="text-base py-3 px-6">
                    Affiliate Products
                  </TabsTrigger>
                </>
              )}
            </TabsList>
            
            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {getFilteredProducts().length > 0 ? (
                getFilteredProducts().map((product) => {
                  // Digital Product Card
                  if ('price' in product) {
                    return (
                      <Card key={product.id} className="overflow-hidden border-2 border-gray-100 hover:border-blue-200 transition-colors">
                        <div className="relative h-40">
                          <img 
                            src={product.image} 
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-2 right-2 flex flex-col gap-2">
                            <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                              {product.type}
                            </Badge>
                            {product.isNew && (
                              <Badge className="bg-green-600 hover:bg-green-700">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold mb-1">{product.title}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xl font-bold text-blue-700">
                                {product.currency === 'GBP' ? '£' : product.currency === 'AUD' ? 'A$' : '$'}{product.price} <span className="text-sm font-normal">{product.currency}</span>
                              </div>
                              {product.hasBonus && (
                                <div className="flex items-center text-xs text-green-600 mt-1">
                                  <Tag className="w-3 h-3 mr-1" />
                                  Includes Bonus Materials
                                </div>
                              )}
                            </div>
                            <Button 
                              onClick={() => handleBuyProduct(product.id)} 
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Buy Now
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  } 
                  // Affiliate Product Card
                  else {
                    return (
                      <Card key={product.id} className="overflow-hidden border-2 border-gray-100 hover:border-blue-200 transition-colors">
                        <div className="relative h-40">
                          <img 
                            src={product.image} 
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                          {product.isPamRecommended && (
                            <Badge className="absolute top-2 left-2 bg-purple-600 hover:bg-purple-700">
                              <Star className="w-3 h-3 mr-1" /> Pam Recommended
                            </Badge>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="text-lg font-semibold mb-1">{product.title}</h3>
                          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
                          <Button 
                            onClick={() => handleExternalLinkClick(product.externalLink)} 
                            variant="outline"
                            className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            View Deal <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  }
                })
              ) : (
                <div className="col-span-full py-12 text-center">
                  <p className="text-lg text-gray-500">No products available in {region} for this category.</p>
                  <p className="text-sm text-gray-400 mt-2">Check back later as we expand our offerings.</p>
                </div>
              )}
            </div>
          </Tabs>
        </div>
        
        {/* Pam Assistant - 25% on desktop, floating button on mobile */}
        <div className={`${isMobile ? 'fixed bottom-4 right-4 z-30' : 'w-full lg:w-1/4'}`}>
          {isMobile ? (
            <button 
              onClick={() => document.getElementById('pam-modal')?.classList.toggle('hidden')}
              className="bg-primary text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg"
            >
              <span className="text-lg font-bold">Pam</span>
            </button>
          ) : (
            <PamAssistant user={user} />
          )}
          
          {/* Mobile Pam modal */}
          {isMobile && (
            <div id="pam-modal" className="hidden fixed inset-0 z-40 bg-black bg-opacity-50">
              <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 max-h-[80vh] overflow-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold">Chat with Pam</h3>
                  <button 
                    onClick={() => document.getElementById('pam-modal')?.classList.add('hidden')}
                    className="text-gray-500"
                  >
                    Close
                  </button>
                </div>
                <PamAssistant user={user} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
