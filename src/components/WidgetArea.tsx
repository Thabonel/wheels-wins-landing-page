
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  ToggleGroup,
  ToggleGroupItem
} from "@/components/ui/toggle-group";
import { ChevronDown, ChevronUp } from "lucide-react";

const WidgetArea = () => {
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [openWidgets, setOpenWidgets] = useState({
    weather: false,
    stocks: false,
    betting: false
  });
  
  const toggleWidget = (widget: keyof typeof openWidgets) => {
    setOpenWidgets(prev => ({ ...prev, [widget]: !prev[widget] }));
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-2xl">Widgets</CardTitle>
      </CardHeader>
      <CardContent>
        <ToggleGroup 
          type="multiple" 
          value={activeWidgets}
          onValueChange={setActiveWidgets}
          className="justify-start mb-6"
        >
          <ToggleGroupItem value="weather" className="text-base">Weather</ToggleGroupItem>
          <ToggleGroupItem value="stocks" className="text-base">Stock Tracking</ToggleGroupItem>
          <ToggleGroupItem value="betting" className="text-base">Gambling/Betting</ToggleGroupItem>
        </ToggleGroup>
        
        {activeWidgets.includes("weather") && (
          <Card className="mb-4">
            <Collapsible 
              open={openWidgets.weather}
              onOpenChange={() => toggleWidget('weather')}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Weather</CardTitle>
                  <CollapsibleTrigger className="hover:bg-muted p-1 rounded-full">
                    {openWidgets.weather ? <ChevronUp /> : <ChevronDown />}
                  </CollapsibleTrigger>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-lg">Uluru: <strong>Sunny, 28°C</strong></p>
                
                <CollapsibleContent className="mt-4">
                  <div className="space-y-2">
                    <p>Tomorrow: Sunny, 30°C</p>
                    <p>Thursday: Partly Cloudy, 27°C</p>
                    <p>Friday: Clear, 29°C</p>
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Collapsible>
          </Card>
        )}
        
        {activeWidgets.includes("stocks") && (
          <Card className="mb-4">
            <Collapsible 
              open={openWidgets.stocks}
              onOpenChange={() => toggleWidget('stocks')}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Stock Tracking</CardTitle>
                  <CollapsibleTrigger className="hover:bg-muted p-1 rounded-full">
                    {openWidgets.stocks ? <ChevronUp /> : <ChevronDown />}
                  </CollapsibleTrigger>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-lg">Portfolio: <strong>+2.1%</strong> today</p>
                
                <CollapsibleContent className="mt-4">
                  <div className="space-y-2">
                    <p>AAPL: $178.72 (+0.8%)</p>
                    <p>MSFT: $417.88 (+1.2%)</p>
                    <p>GOOG: $177.11 (+2.7%)</p>
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Collapsible>
          </Card>
        )}
        
        {activeWidgets.includes("betting") && (
          <Card className="mb-4">
            <Collapsible 
              open={openWidgets.betting}
              onOpenChange={() => toggleWidget('betting')}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Gambling/Betting Tracker</CardTitle>
                  <CollapsibleTrigger className="hover:bg-muted p-1 rounded-full">
                    {openWidgets.betting ? <ChevronUp /> : <ChevronDown />}
                  </CollapsibleTrigger>
                </div>
              </CardHeader>
              
              <CardContent>
                <p className="text-lg">Monthly balance: <strong>+$145</strong></p>
                
                <CollapsibleContent className="mt-4">
                  <div className="space-y-2">
                    <p>Wins: $345</p>
                    <p>Losses: $200</p>
                    <p>Next tracked event: Melbourne Cup (Nov 5)</p>
                  </div>
                </CollapsibleContent>
              </CardContent>
            </Collapsible>
          </Card>
        )}
        
        {activeWidgets.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-lg">No widgets selected</p>
            <p>Toggle the options above to show widgets</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WidgetArea;
