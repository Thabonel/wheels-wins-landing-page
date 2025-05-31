
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Star,
  DollarSign,
  ArrowUpDown,
} from "lucide-react";

export interface HustleFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: "popular" | "earnings" | "rating";
  onSortChange: (sort: "popular" | "earnings" | "rating") => void;
}

export default function HustleFilters({ 
  searchQuery, 
  onSearchChange, 
  sortBy, 
  onSortChange 
}: HustleFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center">
      <div className="relative flex-grow">
        <Input
          placeholder="Search hustles..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button
          variant={sortBy === "popular" ? "default" : "outline"}
          size="sm"
          onClick={() => onSortChange("popular")}
        >
          <Star size={16} className="mr-1" /> Popular
        </Button>
        <Button
          variant={sortBy === "earnings" ? "default" : "outline"}
          size="sm"
          onClick={() => onSortChange("earnings")}
        >
          <DollarSign size={16} className="mr-1" /> Earnings
        </Button>
        <Button
          variant={sortBy === "rating" ? "default" : "outline"}
          size="sm"
          onClick={() => onSortChange("rating")}
        >
          <ArrowUpDown size={16} className="mr-1" /> Rating
        </Button>
      </div>
    </div>
  );
}
