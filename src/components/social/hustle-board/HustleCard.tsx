
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Share2,
  Archive,
  Star,
  PlusCircle,
} from "lucide-react";

export interface HustleCardProps {
  hustle: {
    id: number;
    title: string;
    description: string;
    image: string;
    avgEarnings: number;
    rating: number;
    likes: number;
    trending: boolean;
    tags: string[];
  };
  onArchive: (id: number) => void;
  onShare: (id: number) => void;
  onAddToIncome: (id: number) => void;
}

export default function HustleCard({ hustle, onArchive, onShare, onAddToIncome }: HustleCardProps) {
  return (
    <Card className="overflow-hidden">
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
            <Button size="sm" variant="outline" onClick={() => onAddToIncome(hustle.id)}>
              <PlusCircle size={16} className="mr-1" /> Add to Income
            </Button>
            <Button size="sm" variant="outline" onClick={() => onShare(hustle.id)}>
              <Share2 size={16} className="mr-1" /> Share
            </Button>
            <Button size="sm" variant="outline" onClick={() => onArchive(hustle.id)}>
              <Archive size={16} className="mr-1" /> Archive
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
