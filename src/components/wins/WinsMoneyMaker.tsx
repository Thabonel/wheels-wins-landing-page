
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { PlusCircle, X, Lightbulb, TrendingUp, Users, DollarSign } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

import SummaryCards from "./moneymaker/SummaryCards";
import IncomeChart from "./moneymaker/IncomeChart";
import ActiveIdeasSection from "./moneymaker/ActiveIdeasSection";
import ArchivedIdeasSection from "./moneymaker/ArchivedIdeasSection";
import IncomeIdeaForm from "./moneymaker/IncomeIdeaForm";
import PamSuggestions from "./moneymaker/PamSuggestions";
import HustleBoardSuggestions from "./moneymaker/HustleBoardSuggestions";
import { useMoneyMakerData } from "./moneymaker/useMoneyMakerData";

export default function WinsMoneyMaker() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const { 
    activeIdeas, 
    archivedIdeas, 
    chartData, 
    totalMonthlyIncome, 
    addMoneyMakerIdea,
    isLoading 
  } = useMoneyMakerData();

  // Show guide on first visit
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenMoneyMakerGuide');
    if (!hasSeenGuide && activeIdeas.length === 0) {
      setShowGuide(true);
    }
  }, [activeIdeas]);
  
  if (isLoading) {
    return <div className="text-center py-6">Loading money maker ideas...</div>;
  }

  const handleDismissGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hasSeenMoneyMakerGuide', 'true');
  };
  
  return (
    <div className="space-y-6">
      {/* Onboarding Guide */}
      {showGuide && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Welcome to Money Makers! 💰</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDismissGuide}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Turn your RV lifestyle into income opportunities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="flex gap-3">
                <DollarSign className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Track Income Ideas</p>
                  <p className="text-xs text-muted-foreground">
                    Add and monitor various income sources like remote work, content creation, or services
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Visualize Progress</p>
                  <p className="text-xs text-muted-foreground">
                    See your monthly income trends and compare different revenue streams
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Users className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Community Ideas</p>
                  <p className="text-xs text-muted-foreground">
                    Browse the Hustle Board for income ideas from fellow travelers
                  </p>
                </div>
              </div>
            </div>
            
            <Alert>
              <AlertDescription className="text-sm">
                <strong>Quick Start:</strong> Click "Add Income Idea" to log your first money-making opportunity. 
                You can track hourly rates, project fees, or monthly recurring income!
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Money Makers</h2>
          <p className="text-sm text-muted-foreground">Track your income sources on the road</p>
        </div>
        
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Income Idea
            </Button>
          </DrawerTrigger>
          <IncomeIdeaForm onAddIdea={addMoneyMakerIdea} onClose={() => setDrawerOpen(false)} />
        </Drawer>
      </div>

      {/* Summary cards */}
      <SummaryCards totalMonthlyIncome={totalMonthlyIncome} activeIdeas={activeIdeas} />
      
      {/* Income comparison chart */}
      <IncomeChart chartData={chartData} />
      
      {/* Hustle Board Suggestions */}
      <HustleBoardSuggestions onAddToIncome={addMoneyMakerIdea} />
      
      {/* Active Income Ideas */}
      <ActiveIdeasSection activeIdeas={activeIdeas} />
      
      {/* Archived Ideas (collapsible) */}
      <ArchivedIdeasSection archivedIdeas={archivedIdeas} />
      
      {/* Pam's Suggestions */}
      <PamSuggestions />
    </div>
  );
}
