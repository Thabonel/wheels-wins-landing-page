import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Users,
  Cloud,
  Route,
  DollarSign,
  X,
  Check,
  ChevronRight,
  Brain,
  Navigation,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePAMContext, PAMSuggestion } from './PAMContext';
import { useAuth } from '@/context/AuthContext';
import { tripRecommendationEngine } from '@/services/ml/tripRecommendationEngine';

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
  const { user } = useAuth();
  const { suggestions, setSuggestions, sendMessage } = usePAMContext();
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [loadingSuggestion, setLoadingSuggestion] = useState<string | null>(null);
  const [mlRecommendations, setMlRecommendations] = useState<any[]>([]);
  const [loadingMlRecommendations, setLoadingMlRecommendations] = useState(false);

  const filteredSuggestions = suggestions
    .filter(s => showCategories.includes(s.type))
    .filter(s => !dismissedSuggestions.has(s.id))
    .slice(0, maxSuggestions);

  // Load ML trip recommendations
  useEffect(() => {
    const loadMlRecommendations = async () => {
      if (!user?.id) return;

      setLoadingMlRecommendations(true);
      try {
        const tripContext = {
          current_location: { lat: 40.7128, lng: -74.0060 }, // Default to NYC, would get from user location
          preferences: {
            budget_range: { min: 500, max: 2000 },
            trip_duration_days: 7,
            preferred_activities: ['outdoor', 'sightseeing'],
            accommodation_type: 'rv_park'
          }
        };

        const recommendations = await tripRecommendationEngine.generateRecommendations(
          user.id,
          tripContext,
          { max_recommendations: 3, include_alternatives: true }
        );

        setMlRecommendations(recommendations);
      } catch (error) {
        console.error('Error loading ML trip recommendations:', error);
        setMlRecommendations([]);
      } finally {
        setLoadingMlRecommendations(false);
      }
    };

    if (user?.id) {
      loadMlRecommendations();
    }
  }, [user?.id]);

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

  if (filteredSuggestions.length === 0 && mlRecommendations.length === 0 && !loadingMlRecommendations) {
    return null;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* ML Trip Recommendations */}
      {(mlRecommendations.length > 0 || loadingMlRecommendations) && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-blue-600" />
            <h3 className="font-medium text-sm">AI Route Optimizer</h3>
            {loadingMlRecommendations ? (
              <Badge variant="secondary" className="text-xs">
                <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-1" />
                analyzing...
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">
                {mlRecommendations.length} smart routes
              </Badge>
            )}
          </div>

          {loadingMlRecommendations ? (
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                  <div className="text-sm text-blue-700">Finding optimal routes based on your preferences...</div>
                </div>
              </CardContent>
            </Card>
          ) : (
            mlRecommendations.slice(0, 3).map((recommendation, index) => (
              <Card key={index} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <Navigation className="w-4 h-4 text-blue-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm line-clamp-1">{recommendation.route_name}</h4>
                        <Badge variant="outline" className="text-xs px-2 py-0.5 border-blue-200 text-blue-700">
                          {Math.round(recommendation.confidence_score * 100)}% match
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {recommendation.description || `${recommendation.waypoints?.length || 0} stops • ${recommendation.total_distance?.toFixed(0) || 0} km • ${recommendation.estimated_duration?.toFixed(1) || 0} hours`}
                      </p>

                      <div className="flex items-center gap-3 mb-3 text-xs">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          <span className="font-medium">Cost:</span>
                          <span className="text-green-600">
                            ${recommendation.estimated_cost?.toFixed(0) || 0}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="font-medium">Duration:</span>
                          <span>{recommendation.estimated_duration?.toFixed(1) || 0}h</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {recommendation.optimization_factors?.map((factor: string, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* PAM Suggestions */}
      {filteredSuggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-primary" />
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