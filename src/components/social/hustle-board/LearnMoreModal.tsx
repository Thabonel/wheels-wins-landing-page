import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Star, TrendingUp, ExternalLink, Heart } from "lucide-react";

interface HustleIdea {
  id: string;
  title: string;
  description: string;
  image?: string;
  avg_earnings: number;
  rating: number;
  likes: number;
  trending: boolean;
  tags: string[];
  status: string;
  created_at: string;
}

interface LearnMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  idea: HustleIdea | null;
}

export default function LearnMoreModal({ isOpen, onClose, idea }: LearnMoreModalProps) {
  if (!isOpen || !idea) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-xl mb-2">{idea.title}</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center text-sm text-muted-foreground">
                <Star size={14} className="mr-1 fill-current text-yellow-400" />
                {idea.rating.toFixed(1)} rating
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Heart size={14} className="mr-1 text-red-500" />
                {idea.likes} likes
              </div>
              <div className="font-semibold text-green-600">
                ${idea.avg_earnings.toLocaleString()}/month avg
              </div>
              {idea.trending && (
                <Badge variant="secondary" className="flex items-center">
                  <TrendingUp size={12} className="mr-1" />
                  Trending
                </Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X size={16} />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Image */}
          {idea.image && (
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img 
                src={idea.image} 
                alt={idea.title} 
                className="w-full h-full object-cover" 
              />
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="font-semibold mb-2">About This Opportunity</h3>
            <p className="text-muted-foreground leading-relaxed">
              {idea.description}
            </p>
          </div>

          {/* Tags */}
          {idea.tags && idea.tags.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Skills & Categories</h3>
              <div className="flex flex-wrap gap-2">
                {idea.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Earnings Info */}
          <div>
            <h3 className="font-semibold mb-2">Earning Potential</h3>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 mb-1">
                ${idea.avg_earnings.toLocaleString()}/month
              </div>
              <p className="text-sm text-muted-foreground">
                Average monthly earnings reported by community members
              </p>
            </div>
          </div>

          {/* Getting Started */}
          <div>
            <h3 className="font-semibold mb-2">Getting Started</h3>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-3">
                Ready to start this hustle? Here are some next steps:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Research market demand in your area</li>
                <li>Connect with others doing similar work</li>
                <li>Start small and scale gradually</li>
                <li>Track your progress and earnings</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                // In a real app, this could link to external resources or guides
                window.open(`https://www.google.com/search?q=${encodeURIComponent(idea.title + ' how to get started')}`, '_blank');
              }}
            >
              <ExternalLink size={16} className="mr-2" />
              Search Resources
            </Button>
            <Button className="flex-1" onClick={onClose}>
              Got It!
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}