import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Heart, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase";
import { toast } from "sonner";

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

export default function SocialHustleBoard() {
  const [hustleIdeas, setHustleIdeas] = useState<HustleIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likedIdeas, setLikedIdeas] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchHustleIdeas();
  }, []);

  const fetchHustleIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('hustle_ideas')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching hustle ideas:', error);
        toast.error('Failed to load hustle ideas');
        return;
      }

      setHustleIdeas(data || []);
    } catch (err) {
      console.error('Error in fetchHustleIdeas:', err);
      toast.error('Something went wrong loading hustle ideas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (ideaId: string) => {
    try {
      const isCurrentlyLiked = likedIdeas.has(ideaId);
      const currentIdea = hustleIdeas.find(idea => idea.id === ideaId);
      if (!currentIdea) return;

      const newLikeCount = isCurrentlyLiked ? currentIdea.likes - 1 : currentIdea.likes + 1;

      const { error } = await supabase
        .from('hustle_ideas')
        .update({ likes: newLikeCount })
        .eq('id', ideaId);

      if (error) {
        console.error('Error updating likes:', error);
        toast.error('Failed to update like');
        return;
      }

      // Update local state
      setLikedIdeas(prev => {
        const newSet = new Set(prev);
        if (isCurrentlyLiked) {
          newSet.delete(ideaId);
        } else {
          newSet.add(ideaId);
        }
        return newSet;
      });

      setHustleIdeas(prev => 
        prev.map(idea => 
          idea.id === ideaId 
            ? { ...idea, likes: newLikeCount }
            : idea
        )
      );

      toast.success(isCurrentlyLiked ? 'Like removed' : 'Idea liked!');
    } catch (err) {
      console.error('Error in handleLike:', err);
      toast.error('Something went wrong');
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading hustle ideas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">Hustle Board</h2>
        <p className="text-muted-foreground">
          Discover money-making opportunities perfect for life on the road
        </p>
      </div>

      {hustleIdeas.length === 0 ? (
        <Card className="text-center py-8">
          <CardContent>
            <p className="text-muted-foreground">No hustle ideas available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Be the first to share a money-making opportunity!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hustleIdeas.map((idea) => (
            <Card key={idea.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {idea.image && (
                <div className="aspect-video bg-muted">
                  <img
                    src={idea.image}
                    alt={idea.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{idea.title}</CardTitle>
                  {idea.trending && (
                    <Badge variant="secondary" className="ml-2 flex-shrink-0">
                      <TrendingUp size={12} className="mr-1" />
                      Trending
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center">
                    <Star size={14} className="mr-1 fill-current text-yellow-400" />
                    {idea.rating.toFixed(1)}
                  </div>
                  <div className="font-semibold text-green-600">
                    ${idea.avg_earnings.toLocaleString()}/month
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {idea.description}
                </p>

                {idea.tags && idea.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {idea.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {idea.tags.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{idea.tags.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(idea.id)}
                    className={likedIdeas.has(idea.id) ? "text-red-500" : ""}
                  >
                    <Heart
                      size={16}
                      className={likedIdeas.has(idea.id) ? "fill-current" : ""}
                    />
                    <span className="ml-1">{idea.likes}</span>
                  </Button>
                  
                  <Button size="sm" variant="outline">
                    <ExternalLink size={14} className="mr-1" />
                    Learn More
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-dashed">
        <CardContent className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2">Got a Hustle Idea?</h3>
          <p className="text-muted-foreground mb-4">
            Share your money-making strategies with fellow travelers
          </p>
          <Button>Submit Your Idea</Button>
        </CardContent>
      </Card>
    </div>
  );
}
