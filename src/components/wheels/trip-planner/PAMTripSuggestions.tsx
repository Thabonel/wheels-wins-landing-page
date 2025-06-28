import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  TrendingUp, 
  Users, 
  Cloud, 
  Route,
  DollarSign,
  X,
  Check,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePAMContext, PAMSuggestion } from './PAMContext';

interface PAMTripSuggestionsProps {
  className?: string;
  maxSuggestions?: number;
  showCategories?: string[];
}

export default function PAMTripSuggestions({
  className,
  maxSuggestions = 3,
  showCategories = ['route', 'budget', 'social', 'weather', 'scenic']
}: PAMTripSuggestionsProps) {
  const { suggestions, setSuggestions, sendMessage } = usePAMContext();
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [loadingSuggestion, setLoadingSuggestion] = useState<string | null>(null);

  const filteredSuggestions = suggestions
    .filter(s => showCategories.includes(s.type))
    .filter(s => !dismissedSuggestions.has(s.id))
    .slice(0, maxSuggestions);

  const getSuggestionIcon = (type: PAMSuggestion['type']) => {
    switch (type) {
      case 'route': return Route;
      case 'budget': return DollarSign;
      case 'social': return Users;
      case 'weather': return Cloud;
      case 'scenic': return Sparkles;
      default: return TrendingUp;
    }
  };

  const getSuggestionColor = (type: PAMSuggestion['type']) => {
    switch (type) {
      case 'route': return 'text-primary';
      case 'budget': return 'text-success';
      case 'social': return 'text-warning';
      case 'weather': return 'text-info';
      case 'scenic': return 'text-purple-600';
      default: return 'text-muted-foreground';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-success/20 text-success-foreground';
    if (confidence >= 0.6) return 'bg-warning/20 text-warning-foreground';
    return 'bg-muted text-muted-foreground';
  };

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return 'bg-success/20 text-success-foreground';
      case 'medium': return 'bg-warning/20 text-warning-foreground';
      case 'hard': return 'bg-destructive/20 text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleApplySuggestion = async (suggestion: PAMSuggestion) => {
    setLoadingSuggestion(suggestion.id);
    
    try {
      // Send message to PAM to apply the suggestion
      await sendMessage(`Apply suggestion: ${suggestion.title}`);
      
      // Remove the suggestion from the list
      setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
    } catch (error) {
      console.error('Error applying suggestion:', error);
    } finally {
      setLoadingSuggestion(null);
    }
  };

  const handleDismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set([...prev, suggestionId]));
  };

  if (filteredSuggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-medium text-sm">PAM Suggestions</h3>
        <Badge variant="secondary" className="text-xs">
          {filteredSuggestions.length} active
        </Badge>
      </div>

      {filteredSuggestions.map((suggestion) => {
        const Icon = getSuggestionIcon(suggestion.type);
        const isLoading = loadingSuggestion === suggestion.id;
        
        return (
          <Card key={suggestion.id} className="border-l-4 border-l-primary/50 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={cn("p-2 rounded-lg bg-muted/50", getSuggestionColor(suggestion.type))}>
                  <Icon className="w-4 h-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm line-clamp-1">{suggestion.title}</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={() => handleDismissSuggestion(suggestion.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {suggestion.description}
                  </p>
                  
                  <div className="flex items-center gap-3 mb-3 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Impact:</span>
                      <span className={suggestion.impact.cost >= 0 ? 'text-destructive' : 'text-success'}>
                        ${Math.abs(suggestion.impact.cost)}
                        {suggestion.impact.cost >= 0 ? ' more' : ' saved'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Time:</span>
                      <span className={suggestion.impact.time >= 0 ? 'text-warning' : 'text-success'}>
                        {Math.abs(suggestion.impact.time)}min
                        {suggestion.impact.time >= 0 ? ' longer' : ' shorter'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", getConfidenceColor(suggestion.confidence))}
                      >
                        {Math.round(suggestion.confidence * 100)}% confidence
                      </Badge>
                      
                      <Badge 
                        variant="secondary" 
                        className={cn("text-xs", getDifficultyColor(suggestion.impact.difficulty))}
                      >
                        {suggestion.impact.difficulty}
                      </Badge>
                    </div>
                    
                    {suggestion.actionable && (
                      <Button
                        size="sm"
                        className="h-7"
                        onClick={() => handleApplySuggestion(suggestion)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin mr-1" />
                        ) : (
                          <Check className="w-3 h-3 mr-1" />
                        )}
                        Apply
                        <ChevronRight className="w-3 h-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}