
import { useState } from "react";
import { toast } from "sonner";
import { useSocialData } from "@/components/social/useSocialData";
import { useMoneyMakerData } from "@/components/wins/moneymaker/useMoneyMakerData";

import HustleCard from "./hustle-board/HustleCard";
import HustleFilters from "./hustle-board/HustleFilters";
import PamInsights from "./hustle-board/PamInsights";
import SubmitIdeaCard from "./hustle-board/SubmitIdeaCard";

export default function SocialHustleBoard() {
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
      <PamInsights />

      <HustleFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <div className="space-y-4">
        {sortedHustles.map((hustle) => (
          <HustleCard
            key={hustle.id}
            hustle={hustle}
            onArchive={handleArchive}
            onShare={handleShare}
            onAddToIncome={handleAddToIncome}
          />
        ))}

        {sortedHustles.length === 0 && (
          <div className="text-center py-10">
            <p className="text-gray-500">No results found. Try adjusting your filters.</p>
          </div>
        )}
      </div>

      <SubmitIdeaCard />

      <div className="text-sm text-gray-500">
        <p>• All hustle ideas require admin approval before appearing</p>
        <p>• Add ideas to your income tracker to measure your own results</p>
        <p>• Share your success stories to help the community</p>
      </div>
    </div>
  );
}
