
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { Lightbulb } from "lucide-react";

import TipCard from "./tips/TipCard";
import TipsLeaderboard from "./tips/TipsLeaderboard";
import PamPicksCard from "./tips/PamPicksCard";
import TipShareForm from "./tips/TipShareForm";
import TipCategorySection from "./tips/TipCategorySection";
import { useTipsData } from "./tips/useTipsData";

export default function WinsTips() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { tipCategories, leaderboardData } = useTipsData();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Money-Saving Tips</h2>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerTrigger asChild>
            <Button>
              <Lightbulb className="mr-2 h-4 w-4" />
              Share Your Tip
            </Button>
          </DrawerTrigger>
          <TipShareForm />
        </Drawer>
      </div>
      
      <Tabs defaultValue="tips" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tips">Weekly Tips</TabsTrigger>
          <TabsTrigger value="leaderboard">Savings Leaderboard</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tips" className="space-y-4 mt-6">
          {tipCategories.map((category) => (
            <TipCategorySection key={category.id} category={category} />
          ))}
        </TabsContent>
        
        <TabsContent value="leaderboard">
          <TipsLeaderboard leaderboardData={leaderboardData} />
        </TabsContent>
      </Tabs>
      
      <PamPicksCard />
    </div>
  );
}
