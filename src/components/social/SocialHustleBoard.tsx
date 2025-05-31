
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  TrendingUp,
  Archive,
  Share2,
  Filter,
  Star,
  DollarSign,
  Clock,
  ArrowUpDown,
  MessageSquare,
  PlusCircle,
} from "lucide-react";
import { useSocialData } from "@/components/social/useSocialData";
import { useMoneyMakerData } from "@/components/wins/moneymaker/useMoneyMakerData";

interface Hustle {
  id: number;
  title: string;
  description: string;
  image: string;
  avgEarnings: number;
  rating: number;
  likes: number;
  trending: boolean;
  tags: string[];
}

export default function SocialHustleBoard() {
  // Default hustles to an empty array
  const { hustles = [] } = useSocialData();
  const { activeIdeas } = useMoneyMakerData();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"popular" | "earnings" | "rating">("popular");
  const [archivedIds, setArchivedIds] = useState<number[]>([]);

  const handleArchive = (hustleId: number) => {
    setArchivedIds([...archivedIds, hustleId]);
    toast.success("Hustle archived successfully");
  };

  const handleShare = (hustleId: number) => {
    toast.info("Share feature coming soon!");
  };

  const handleAddToIncome = (hustleId: number) => {
    toast.success("Added to your income ideas!");
  };

  const getSortedHustles = () => {
    // Ensure hustles is always an array
    const filteredHustles = hustles.filter((hustle) => {
      if (archivedIds.includes(hustle.id)) {
        return false;
      }
      if (searchQuery && !hustle.title.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    });

    return filteredHustles.sort((a, b) => {
      switch (sortBy) {
        case "earnings":
          return b.avgEarnings - a.avgEarnings;
        case "rating":
          return b.rating - a.rating;
        case "popular":
        default:
          return b.likes - a.likes;
      }
    });
  };

  const sortedHustles = getSortedHustles();

  return (
    <div className="space-y-8">
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

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative flex-grow">
          <Input
            placeholder="Search hustles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={sortBy === "popular" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("popular")}
          >
            <Star size={16} className="mr-1" /> Popular
          </Button>
          <Button
            variant={sortBy === "earnings" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("earnings")}
          >
            <DollarSign size={16} className="mr-1" /> Earnings
          </Button>
          <Button
            variant={sortBy === "rating" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("rating")}
          >
            <ArrowUpDown size={16} className="mr-1" /> Rating
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {sortedHustles.map((hustle) => (
          <Card key={hustle.id} className="overflow-hidden">
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-48 h-40">
                <img src={hustle.image} alt={hustle.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-grow p-4">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-lg flex items-center">
                    {hustle.title}
                    {hustle.trending && <Badge className="ml-2 bg-red-500">Trending</Badge>}
                  </h4>
                  <Badge className="bg-green-500">${hustle.avgEarnings}/mo</Badge>
                </div>
                <div className="flex items-center text-sm text-gray-600 mt-1">
                  <Star size={16} className="mr-1" fill="gold" stroke="gold" /> {hustle.rating.toFixed(1)} •{" "}
                  {hustle.likes} travelers like this
                </div>
                <p className="text-sm text-gray-700 my-3">{hustle.description}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {hustle.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs bg-gray-50">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleAddToIncome(hustle.id)}>
                    <PlusCircle size={16} className="mr-1" /> Add to Income
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleShare(hustle.id)}>
                    <Share2 size={16} className="mr-1" /> Share
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleArchive(hustle.id)}>
                    <Archive size={16} className="mr-1" /> Archive
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {sortedHustles.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500">No results found. Try adjusting your filters.</p>
          </div>
        )}
      </div>

      <Card className="bg-gray-50 border-dashed border-2 border-gray-300 p-6 text-center">
        <CardContent>
          <h4 className="text-lg font-semibold">Have a money-making idea to share?</h4>
          <p className="text-gray-700 mb-4">Help other travelers find new income sources while on the road!</p>
          <Button>
            <TrendingUp size={18} className="mr-2" /> Submit Your Idea
          </Button>
        </CardContent>
      </Card>

      <div className="text-sm text-gray-500">
        <p>• All hustle ideas require admin approval before appearing</p>
        <p>• Add ideas to your income tracker to measure your own results</p>
        <p>• Share your success stories to help the community</p>
      </div>
    </div>
  );
}
