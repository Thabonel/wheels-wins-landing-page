
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

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
              <CollapsibleTrigger className="hover:bg-muted p-1 rounded-full">
                {openCards.tripStatus ? <ChevronUp /> : <ChevronDown />}
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          
          <CardContent>
            <p className="text-lg">Next stop: <strong>Uluru</strong>, 3 days away</p>
            
            <CollapsibleContent className="mt-4">
              <div className="space-y-2">
                <p>Distance remaining: 450 km</p>
                <p>Estimated arrival: May 6th, 2:30 PM</p>
                <p>Weather at destination: Sunny, 28°C</p>
              </div>
            </CollapsibleContent>
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
              <CollapsibleTrigger className="hover:bg-muted p-1 rounded-full">
                {openCards.budgetSummary ? <ChevronUp /> : <ChevronDown />}
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          
          <CardContent>
            <p className="text-lg">This week: <strong>$142</strong> spent of <strong>$300</strong></p>
            
            <CollapsibleContent className="mt-4">
              <div className="space-y-2">
                <p>Fuel: $78</p>
                <p>Food: $45</p>
                <p>Accommodation: $19</p>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>
      
      {/* To-Dos Card */}
      <Card>
        <Collapsible 
          open={openCards.todos}
          onOpenChange={() => toggleCard('todos')}
        >
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">To-Dos</CardTitle>
              <CollapsibleTrigger className="hover:bg-muted p-1 rounded-full">
                {openCards.todos ? <ChevronUp /> : <ChevronDown />}
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
              <CollapsibleTrigger className="hover:bg-muted p-1 rounded-full">
                {openCards.pamSuggestions ? <ChevronUp /> : <ChevronDown />}
              </CollapsibleTrigger>
            </div>
          </CardHeader>
          
          <CardContent>
            <p className="text-lg">Want help reviewing this week's expenses?</p>
            
            <CollapsibleContent className="mt-4">
              <div className="space-y-2">
                <p>I've noticed you spent more on fuel than usual this week. Want to see nearby stations with better prices?</p>
                <p>There's a free campground near your next destination that has great reviews!</p>
              </div>
            </CollapsibleContent>
          </CardContent>
        </Collapsible>
      </Card>
    </div>
  );
};

export default DashboardCards;
