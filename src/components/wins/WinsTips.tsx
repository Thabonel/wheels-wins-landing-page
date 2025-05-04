
import { useState } from "react";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Drawer, DrawerClose, DrawerContent, DrawerDescription, 
  DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger 
} from "@/components/ui/drawer";
import { 
  Collapsible, CollapsibleContent, CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { ChevronDown, Lightbulb, ThumbsUp, Send } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function WinsTips() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [expandedTip, setExpandedTip] = useState<string | null>(null);
  
  const toggleExpandTip = (id: string) => {
    if (expandedTip === id) {
      setExpandedTip(null);
    } else {
      setExpandedTip(id);
    }
  };
  
  // Sample tips data
  const tipCategories = [
    {
      id: "fuel",
      name: "Fuel Savings",
      tips: [
        {
          id: "f1",
          title: "Gas Buddy + Credit Card Combo",
          content: "Use GasBuddy to find cheap gas, then pay with a 5% cash-back credit card for fuel purchases. This combo can save you up to 25-30 cents per gallon!",
          source: "Pam",
          likes: 43,
          isNew: true
        },
        {
          id: "f2",
          title: "Maintain Optimal Tire Pressure",
          content: "Keeping your tires at the recommended pressure can improve fuel efficiency by 3%. For an RV, that's significant savings over long trips.",
          source: "Community",
          likes: 28,
          isNew: false
        },
        {
          id: "f3",
          title: "Plan Travel Days for Tuesday/Wednesday",
          content: "Gas prices are typically lowest mid-week. By planning your travel days for Tuesday or Wednesday, you can save an average of 10-15 cents per gallon versus weekend fill-ups.",
          source: "Pam",
          likes: 17,
          isNew: true
        }
      ]
    },
    {
      id: "food",
      name: "Food & Groceries",
      tips: [
        {
          id: "food1",
          title: "Shop at Aldi in Urban Areas",
          content: "Whenever passing through larger towns, stock up at Aldi. Travelers report saving 30-40% compared to other grocery chains, especially on staples and produce.",
          source: "Community",
          likes: 52,
          isNew: false
        },
        {
          id: "food2",
          title: "Use a Vacuum Sealer for Bulk Meat",
          content: "Buy meat in bulk when on sale, portion and vacuum seal it. This extends freezer life to 6+ months and lets you take advantage of sales wherever you find them.",
          source: "Pam",
          likes: 36,
          isNew: false
        }
      ]
    },
    {
      id: "camp",
      name: "Camping Deals",
      tips: [
        {
          id: "camp1",
          title: "BLM Land Near National Parks",
          content: "Instead of staying inside National Parks ($35+ per night), look for Bureau of Land Management areas nearby. They're often free for 14-day stays and just 15-20 minutes away from park entrances.",
          source: "Pam",
          likes: 64,
          isNew: false
        },
        {
          id: "camp2",
          title: "Harvest Hosts for Free Overnight Stays",
          content: "With a $99/year Harvest Hosts membership, you can stay overnight for free at 3,000+ wineries, farms, and attractions. While there's an expectation to support the business ($20 purchase), it's still cheaper than most campgrounds and you get local experiences.",
          source: "Community",
          likes: 41,
          isNew: true
        }
      ]
    }
  ];
  
  const leaderboardData = [
    { name: "RVAdventures", points: 1250, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" },
    { name: "WanderingFamily", points: 950, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" },
    { name: "RoadTripQueen", points: 820, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" },
    { name: "FrugalTraveler", points: 780, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" },
    { name: "BoondockerLife", points: 675, avatar: "https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/avatar-placeholder.png" }
  ];
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Money-Saving Tips</h2>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button>
              <Lightbulb className="mr-2 h-4 w-4" />
              Share Your Tip
            </Button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Share a Money-Saving Tip</DrawerTitle>
              <DrawerDescription>
                Help fellow travelers save money on the road
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 py-2">
              <form className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="tip-title">Title</label>
                  <Input id="tip-title" placeholder="Give your tip a clear title" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="tip-category">Category</label>
                  <select 
                    id="tip-category" 
                    className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
                  >
                    <option value="">Select a category</option>
                    <option value="fuel">Fuel Savings</option>
                    <option value="food">Food & Groceries</option>
                    <option value="camp">Camping Deals</option>
                    <option value="fun">Entertainment</option>
                    <option value="other">Other Savings</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="tip-content">Your Tip</label>
                  <textarea 
                    id="tip-content" 
                    rows={4}
                    placeholder="Describe your money-saving tip in detail"
                    className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
                  ></textarea>
                </div>
              </form>
            </div>
            <DrawerFooter>
              <Button>Submit Tip</Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>
      
      <Tabs defaultValue="tips" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tips">Weekly Tips</TabsTrigger>
          <TabsTrigger value="leaderboard">Savings Leaderboard</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tips" className="space-y-4 mt-6">
          {tipCategories.map((category) => (
            <div key={category.id}>
              <h3 className="font-medium text-lg mb-3">{category.name}</h3>
              <div className="space-y-3">
                {category.tips.map((tip) => (
                  <Card key={tip.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {tip.title}
                            {tip.isNew && <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">New</Badge>}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <span>From: {tip.source}</span>
                            <span className="text-muted-foreground inline-flex items-center gap-1 ml-3">
                              <ThumbsUp className="h-3 w-3" /> {tip.likes}
                            </span>
                          </CardDescription>
                        </div>
                        <CollapsibleTrigger 
                          onClick={() => toggleExpandTip(tip.id)} 
                          className="rounded-full h-6 w-6 flex items-center justify-center hover:bg-muted"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${expandedTip === tip.id ? 'transform rotate-180' : ''}`} />
                        </CollapsibleTrigger>
                      </div>
                    </CardHeader>
                    <Collapsible open={expandedTip === tip.id}>
                      <CollapsibleContent>
                        <CardContent className="pt-0 pb-3">
                          <p className="text-sm">{tip.content}</p>
                        </CardContent>
                        <CardFooter className="pt-0 pb-3 flex justify-end gap-2">
                          <Button size="sm" variant="ghost" className="text-muted-foreground">
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            Like
                          </Button>
                          <Button size="sm" variant="ghost" className="text-muted-foreground">
                            <Send className="h-4 w-4 mr-1" />
                            Share
                          </Button>
                        </CardFooter>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </TabsContent>
        
        <TabsContent value="leaderboard">
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Top Savers Community</CardTitle>
              <CardDescription>
                Members with the most savings points from tips, challenges, and budget wins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {leaderboardData.map((user, index) => (
                  <div key={index} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="font-bold text-lg w-6 text-center">
                        {index + 1}
                      </div>
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-muted">
                        <img 
                          src={user.avatar} 
                          alt={user.name} 
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {index === 0 ? "Mega Saver" : index < 3 ? "Pro Saver" : "Savvy Traveler"}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-lg">{user.points}</div>
                      <div className="text-sm text-muted-foreground">points</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Join Savings Challenge</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      
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
    </div>
  );
}
