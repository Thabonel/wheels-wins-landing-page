
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, PlusCircle, ExternalLink, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HustleIdea {
  id: string;
  title: string;
  description: string;
  avg_earnings: number;
  rating: number;
  likes: number;
  trending: boolean;
  tags: string[];
}

interface HustleBoardSuggestionsProps {
  onAddToIncome: (idea: Omit<any, 'id' | 'startDate' | 'trend' | 'growth' | 'topPerformer'>) => Promise<boolean>;
}

export default function HustleBoardSuggestions({ onAddToIncome }: HustleBoardSuggestionsProps) {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<HustleIdea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchSuggestions();
  }, [user]);

  const fetchSuggestions = async () => {
    try {
      // Get top 3 trending or highly-rated hustle ideas that user hasn't added yet
      const { data: existingIdeas } = await supabase
        .from('money_maker_ideas')
        .select('name')
        .eq('user_id', user?.id);

      const existingNames = existingIdeas?.map(idea => idea.name.toLowerCase()) || [];

      const { data, error } = await supabase
        .from('hustle_ideas')
        .select('*')
        .eq('status', 'approved')
        .order('rating', { ascending: false })
        .limit(3);

      if (error) {
        console.error('Error fetching suggestions:', error);
        return;
      }

      // Filter out ideas user already has
      const filteredSuggestions = data?.filter(idea => 
        !existingNames.includes(idea.title.toLowerCase())
      ) || [];

      setSuggestions(filteredSuggestions.slice(0, 3));
    } catch (err) {
      console.error('Error in fetchSuggestions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToIncome = async (idea: HustleIdea) => {
    const success = await onAddToIncome({
      name: idea.title,
      status: 'Active',
      monthlyIncome: 0,
      notes: idea.description
    });

    if (success) {
      // Remove from suggestions after adding
      setSuggestions(prev => prev.filter(s => s.id !== idea.id));
    }
  };

  if (isLoading || suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp size={20} className="text-purple-600" />
          Trending Hustle Ideas
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>These are proven income ideas shared by other travelers. Click "Add to Income" to start tracking any idea you want to try.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Popular opportunities from the community you might want to try
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((idea) => (
            <div key={idea.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold flex items-center gap-2">
                  {idea.title}
                  {idea.trending && (
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp size={10} className="mr-1" />
                      Trending
                    </Badge>
                  )}
                </h4>
                <div className="text-right">
                  <div className="font-semibold text-green-600">
                    ${idea.avg_earnings.toLocaleString()}/mo
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Star size={12} className="mr-1 fill-current text-yellow-400" />
                    {idea.rating.toFixed(1)}
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {idea.description}
              </p>
              
              {idea.tags && idea.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {idea.tags.slice(0, 3).map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => handleAddToIncome(idea)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <PlusCircle size={14} className="mr-1" />
                  Add to My Income
                </Button>
                <Button size="sm" variant="outline">
                  <ExternalLink size={14} className="mr-1" />
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
