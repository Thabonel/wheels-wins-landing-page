
import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useScrollReset } from "@/hooks/useScrollReset";
import { SocialErrorBoundary } from "@/components/common/SocialErrorBoundary";

// Social page components
import SocialFeed from "@/components/social/SocialFeed";
import SocialGroups from "@/components/social/SocialGroups";
import SocialMarketplace from "@/components/social/SocialMarketplace";
import SocialHustleBoard from "@/components/social/SocialHustleBoard";
import SocialNetworking from "@/components/community/SocialNetworking";
import GroupPlanning from "@/components/community/GroupPlanning";
import ContentModeration from "@/components/community/ContentModeration";

export default function Social() {
  const [activeTab, setActiveTab] = useState("feed");
 
  // Reset scroll when active tab changes
  useScrollReset([activeTab]);
  
  const tabs = [
    { id: "feed", label: "Feed", icon: "MessageSquare" },
    { id: "groups", label: "Groups", icon: "Users" },
    { id: "networking", label: "Network", icon: "Users" },
    { id: "planning", label: "Planning", icon: "Calendar" },
    { id: "marketplace", label: "Marketplace", icon: "ShoppingCart" },
    { id: "hustle-board", label: "Hustle Board", icon: "TrendingUp" },
    { id: "moderation", label: "Moderation", icon: "Shield" },
  ];
  
  return (
    <div className="container p-6">
      {/* Debug info */}
      <div className="mb-4 p-2 bg-blue-50 rounded text-sm">
        Social page loaded. Active tab: {activeTab}
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - 75% on desktop */}
        <div className="w-full lg:w-3/4">
          <Tabs 
            defaultValue="feed" 
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="w-full justify-start flex-wrap mb-6">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className="text-base py-3 px-6 flex items-center gap-2"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <div className="bg-white rounded-lg border p-4 min-h-[600px]">
              <TabsContent value="feed">
                <SocialErrorBoundary>
                  <SocialFeed />
                </SocialErrorBoundary>
              </TabsContent>
              <TabsContent value="groups">
                <SocialErrorBoundary>
                  <SocialGroups />
                </SocialErrorBoundary>
              </TabsContent>
              <TabsContent value="networking">
                <SocialErrorBoundary>
                  <SocialNetworking />
                </SocialErrorBoundary>
              </TabsContent>
              <TabsContent value="planning">
                <SocialErrorBoundary>
                  <GroupPlanning />
                </SocialErrorBoundary>
              </TabsContent>
              <TabsContent value="marketplace">
                <SocialErrorBoundary>
                  <SocialMarketplace />
                </SocialErrorBoundary>
              </TabsContent>
              <TabsContent value="hustle-board">
                <SocialErrorBoundary>
                  <SocialHustleBoard />
                </SocialErrorBoundary>
              </TabsContent>
              <TabsContent value="moderation">
                <SocialErrorBoundary>
                  <ContentModeration />
                </SocialErrorBoundary>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
