import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Heart, ExternalLink, PlusCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import SubmitIdeaForm from "./hustle-board/SubmitIdeaForm";
import LearnMoreModal from "./hustle-board/LearnMoreModal";
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
  const {
    user
  } = useAuth();
  const [hustleIdeas, setHustleIdeas] = useState<HustleIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [likedIdeas, setLikedIdeas] = useState<Set<string>>(new Set());
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [showLearnMore, setShowLearnMore] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<HustleIdea | null>(null);
  useEffect(() => {
    fetchHustleIdeas();
  }, []);
  const fetchHustleIdeas = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('hustle_ideas').select('*').eq('status', 'approved').order('created_at', {
        ascending: false
      });
      if (error) {
        console.error('Error fetching hustle ideas:', error);
        console.error('Error code:', error.code);
        console.error('Error details:', error.details);
        
        // Only show error toast for actual errors, not empty data
        if (error.code === 'PGRST116') {
          // Table not found
          console.log('Hustle ideas table not found');
          setHustleIdeas([]);
        } else if (error.code === 'PGRST301') {
          // No rows found - this is fine, just empty data
          console.log('No hustle ideas found - showing empty state');
          setHustleIdeas([]);
        } else {
          // Actual error
          toast.error('Failed to load hustle ideas');
        }
        return;
      }
      
      // Set data or empty array
      setHustleIdeas(data || []);
      
      // Log for debugging
      console.log(`Loaded ${(data || []).length} hustle ideas`);
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
      const {
        error
      } = await supabase.from('hustle_ideas').update({
        likes: newLikeCount
      }).eq('id', ideaId);
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
      setHustleIdeas(prev => prev.map(idea => idea.id === ideaId ? {
        ...idea,
        likes: newLikeCount
      } : idea));
      toast.success(isCurrentlyLiked ? 'Like removed' : 'Idea liked!');
    } catch (err) {
      console.error('Error in handleLike:', err);
      toast.error('Something went wrong');
    }
  };
  const handleLearnMore = (idea: HustleIdea) => {
    setSelectedIdea(idea);
    setShowLearnMore(true);
  };

  const handleAddToIncome = async (idea: HustleIdea) => {
    if (!user) {
      toast.error("You must be logged in to add ideas to your income tracker");
      return;
    }
    try {
      const {
        error
      } = await supabase.from('money_maker_ideas').insert({
        user_id: user.id,
        name: idea.title,
        description: idea.description,
        category: idea.tags[0] || 'general',
        monthly_income: 0,
        // User will set this as they start earning
        status: 'Active',
        progress: 0
      });
      if (error) {
        console.error('Error adding to income tracker:', error);
        toast.error('Failed to add to your income tracker');
        return;
      }
      toast.success(`"${idea.title}" added to your Money Maker tracker!`);
    } catch (err) {
      console.error('Error in handleAddToIncome:', err);
      toast.error('Something went wrong');
    }
  };
  if (isLoading) {
    return <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading hustle ideas...</p>
      </div>;
  }
  return <div className="space-y-6">
      <div className="text-center mb-6">
        
        <p className="text-muted-foreground">
          Discover money-making opportunities perfect for life on the road
        </p>
      </div>

      {hustleIdeas.length === 0 ? <Card className="text-center py-8">
          <CardContent>
            <p className="text-muted-foreground">No hustle ideas available yet.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Be the first to share a money-making opportunity!
            </p>
          </CardContent>
        </Card> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hustleIdeas.map(idea => <Card key={idea.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {idea.image && <div className="aspect-video bg-muted">
                  <img src={idea.image} alt={idea.title} className="w-full h-full object-cover" />
                </div>}
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{idea.title}</CardTitle>
                  {idea.trending && <Badge variant="secondary" className="ml-2 flex-shrink-0">
                      <TrendingUp size={12} className="mr-1" />
                      Trending
                    </Badge>}
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

                {idea.tags && idea.tags.length > 0 && <div className="flex flex-wrap gap-1 mb-4">
                    {idea.tags.slice(0, 3).map((tag, index) => <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>)}
                    {idea.tags.length > 3 && <Badge variant="outline" className="text-xs">
                        +{idea.tags.length - 3}
                      </Badge>}
                  </div>}

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleLike(idea.id)} className={likedIdeas.has(idea.id) ? "text-red-500" : ""}>
                      <Heart size={16} className={likedIdeas.has(idea.id) ? "fill-current" : ""} />
                      <span className="ml-1">{idea.likes}</span>
                    </Button>
                    
                    <Button size="sm" variant="outline" onClick={() => handleLearnMore(idea)}>
                      <ExternalLink size={14} className="mr-1" />
                      Learn More
                    </Button>
                  </div>
                  
                  <Button size="sm" variant="default" onClick={() => handleAddToIncome(idea)} className="bg-green-600 hover:bg-green-700">
                    <PlusCircle size={14} className="mr-1" />
                    Add to Income
                  </Button>
                </div>
              </CardContent>
            </Card>)}
        </div>}

      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-dashed">
        <CardContent className="text-center py-8">
          <h3 className="text-lg font-semibold mb-2">Got a Hustle Idea?</h3>
          <p className="text-muted-foreground mb-4">
            Share your money-making strategies with fellow travelers
          </p>
          <Button onClick={() => setShowSubmitForm(true)}>Submit Your Idea</Button>
        </CardContent>
      </Card>

      {/* Submit Idea Form */}
      <SubmitIdeaForm
        isOpen={showSubmitForm}
        onClose={() => setShowSubmitForm(false)}
        onIdeaSubmitted={fetchHustleIdeas}
      />

      {/* Learn More Modal */}
      <LearnMoreModal
        isOpen={showLearnMore}
        onClose={() => setShowLearnMore(false)}
        idea={selectedIdea}
      />
    </div>;
}