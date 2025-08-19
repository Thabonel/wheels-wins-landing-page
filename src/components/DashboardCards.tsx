
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useTripStatus } from "@/hooks/useTripStatus";
import { useBudgetSummary } from "@/hooks/useBudgetSummary";
import { usePamSuggestions } from "@/hooks/usePamSuggestions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DashboardCards = () => {
  const [openCards, setOpenCards] = useState({
    tripStatus: false,
    budgetSummary: false,
    todos: false,
    pamSuggestions: false
  });

  const toggleCard = (card: keyof typeof openCards) => {
    setOpenCards(prev => ({ ...prev, [card]: !prev[card] }));
  };

  // Load real data
  const { 
    tripStatus, 
    loading: tripLoading, 
    error: tripError, 
    refreshTripStatus 
  } = useTripStatus();
  
  const { 
    budgetSummary, 
    loading: budgetLoading, 
    error: budgetError, 
    refreshBudgetSummary 
  } = useBudgetSummary();
  
  const {
    suggestions,
    loading: suggestionsLoading,
    error: suggestionsError,
    refreshSuggestions,
    dismissSuggestion
  } = usePamSuggestions();

  // Load saved UI preferences
  useEffect(() => {
    const savedPrefs = localStorage.getItem('dashboard-card-prefs');
    if (savedPrefs) {
      try {
        setOpenCards(JSON.parse(savedPrefs));
      } catch (e) {
        console.error('Failed to load card preferences');
      }
    }
  }, []);

  // Save UI preferences when they change
  useEffect(() => {
    localStorage.setItem('dashboard-card-prefs', JSON.stringify(openCards));
  }, [openCards]);
  
  return (
    <div className="space-y-6 mb-6">
      {/* Trip Status Card */}
      <Card>
        <Collapsible 
          open={openCards.tripStatus}
          onOpenChange={() => toggleCard('tripStatus')}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">Trip Status</CardTitle>
              <div className="flex items-center gap-2">
                {tripStatus && !tripLoading && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshTripStatus();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-sm">
                    {openCards.tripStatus ? "Hide Details" : "Show Details"}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {tripLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
            
            {tripError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {tripError}
                </AlertDescription>
              </Alert>
            )}
            
            {!tripLoading && !tripError && tripStatus?.isActive ? (
              <>
                <p className="text-lg">
                  Next stop: <strong>{tripStatus.nextStop?.name || 'No stops planned'}</strong>
                  {tripStatus.daysUntilNextStop && `, ${tripStatus.daysUntilNextStop} days away`}
                </p>
                
                <CollapsibleContent className="mt-4">
                  <div className="space-y-2">
                    {tripStatus.distanceRemaining && (
                      <p>Distance remaining: {tripStatus.distanceRemaining} km</p>
                    )}
                    {tripStatus.estimatedArrival && (
                      <p>Estimated arrival: {tripStatus.estimatedArrival}</p>
                    )}
                    {tripStatus.weatherAtDestination && (
                      <p>
                        Weather at destination: {tripStatus.weatherAtDestination.condition}, {tripStatus.weatherAtDestination.temperature}°C
                      </p>
                    )}
                    {tripStatus.percentageComplete > 0 && (
                      <div className="mt-2">
                        <div className="flex justify-between text-sm">
                          <span>Trip Progress</span>
                          <span>{tripStatus.percentageComplete}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${tripStatus.percentageComplete}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </>
            ) : !tripLoading && !tripError && (
              <div className="text-muted-foreground">
                <p>No active trip</p>
                <p className="text-sm mt-2">Plan a trip to see your status here</p>
              </div>
            )}
          </CardContent>
        </Collapsible>
      </Card>
      
      {/* Budget Summary Card */}
      <Card>
        <Collapsible 
          open={openCards.budgetSummary}
          onOpenChange={() => toggleCard('budgetSummary')}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">Budget Summary</CardTitle>
              <div className="flex items-center gap-2">
                {budgetSummary && !budgetLoading && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshBudgetSummary();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-sm">
                    {openCards.budgetSummary ? "Hide Details" : "Show Details"}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {budgetLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
            
            {budgetError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {budgetError}
                </AlertDescription>
              </Alert>
            )}
            
            {!budgetLoading && !budgetError && budgetSummary ? (
              <>
                <p className="text-lg">
                  This week: <strong>${budgetSummary.totalSpent.toFixed(2)}</strong> spent of <strong>${budgetSummary.weeklyBudget.toFixed(2)}</strong>
                </p>
                
                {budgetSummary.remaining < 0 && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Over budget by ${Math.abs(budgetSummary.remaining).toFixed(2)}
                    </AlertDescription>
                  </Alert>
                )}
                
                <CollapsibleContent className="mt-4">
                  <div className="space-y-2">
                    {budgetSummary.categoryBreakdown.fuel > 0 && (
                      <p>Fuel: ${budgetSummary.categoryBreakdown.fuel.toFixed(2)}</p>
                    )}
                    {budgetSummary.categoryBreakdown.food > 0 && (
                      <p>Food: ${budgetSummary.categoryBreakdown.food.toFixed(2)}</p>
                    )}
                    {budgetSummary.categoryBreakdown.accommodation > 0 && (
                      <p>Accommodation: ${budgetSummary.categoryBreakdown.accommodation.toFixed(2)}</p>
                    )}
                    {budgetSummary.categoryBreakdown.entertainment > 0 && (
                      <p>Entertainment: ${budgetSummary.categoryBreakdown.entertainment.toFixed(2)}</p>
                    )}
                    {budgetSummary.categoryBreakdown.other > 0 && (
                      <p>Other: ${budgetSummary.categoryBreakdown.other.toFixed(2)}</p>
                    )}
                    
                    <div className="mt-3">
                      <div className="flex justify-between text-sm">
                        <span>Budget Used</span>
                        <span>{budgetSummary.percentageUsed}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className={`h-2 rounded-full transition-all ${
                            budgetSummary.percentageUsed > 100 ? 'bg-destructive' : 
                            budgetSummary.percentageUsed > 80 ? 'bg-yellow-500' : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(budgetSummary.percentageUsed, 100)}%` }}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {budgetSummary.daysRemaining} days remaining in week
                      </p>
                    </div>
                  </div>
                </CollapsibleContent>
              </>
            ) : !budgetLoading && !budgetError && (
              <div className="text-muted-foreground">
                <p>No budget data available</p>
                <p className="text-sm mt-2">Start tracking expenses to see your budget</p>
              </div>
            )}
          </CardContent>
        </Collapsible>
      </Card>
      
      {/* To-Dos Card */}
      {/* TODO: Create todos table in database and implement useTodos hook */}
      <Card>
        <Collapsible 
          open={openCards.todos}
          onOpenChange={() => toggleCard('todos')}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">To-Dos</CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-sm">
                  {openCards.todos ? "Show Less" : "Show More"}
                </Button>
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          
          <CardContent>
            <ul className="space-y-2">
              <li className="text-lg">• Book campground in Alice Springs</li>
              <li className="text-lg">• Top up fuel</li>
            </ul>
            
            <CollapsibleContent className="mt-4">
              <ul className="space-y-2">
                <li>Check water tank levels</li>
                <li>Call John about dinner plans</li>
                <li>Update trip journal</li>
              </ul>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>
      
      {/* Pam's Suggestions Card */}
      <Card>
        <Collapsible 
          open={openCards.pamSuggestions}
          onOpenChange={() => toggleCard('pamSuggestions')}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">Pam's Daily Suggestions</CardTitle>
              <div className="flex items-center gap-2">
                {suggestions.length > 0 && !suggestionsLoading && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      refreshSuggestions();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                )}
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-sm">
                    {openCards.pamSuggestions ? "Show Less" : "Show More"}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            {suggestionsLoading && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            )}
            
            {suggestionsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {suggestionsError}
                </AlertDescription>
              </Alert>
            )}
            
            {!suggestionsLoading && !suggestionsError && suggestions.length > 0 ? (
              <>
                <div className="space-y-3">
                  {suggestions.slice(0, 1).map((suggestion) => (
                    <div key={suggestion.id}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-lg font-medium">{suggestion.title}</p>
                        <Badge variant={
                          suggestion.priority === 'high' ? 'destructive' : 
                          suggestion.priority === 'medium' ? 'default' : 'secondary'
                        }>
                          {suggestion.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {suggestion.description}
                      </p>
                      {suggestion.actionable && suggestion.action && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2"
                          onClick={suggestion.action.handler}
                        >
                          {suggestion.action.label}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                
                <CollapsibleContent className="mt-4">
                  <div className="space-y-3">
                    {suggestions.slice(1).map((suggestion) => (
                      <div key={suggestion.id} className="border-t pt-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{suggestion.title}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              suggestion.priority === 'high' ? 'destructive' : 
                              suggestion.priority === 'medium' ? 'default' : 'secondary'
                            }>
                              {suggestion.priority}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => dismissSuggestion(suggestion.id)}
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {suggestion.description}
                        </p>
                        {suggestion.actionable && suggestion.action && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            onClick={suggestion.action.handler}
                          >
                            {suggestion.action.label}
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </>
            ) : !suggestionsLoading && !suggestionsError && (
              <div className="text-muted-foreground">
                <p>No suggestions right now</p>
                <p className="text-sm mt-2">PAM will provide helpful tips based on your activity</p>
              </div>
            )}
          </CardContent>
        </Collapsible>
      </Card>
    </div>
  );
};

export default DashboardCards;
