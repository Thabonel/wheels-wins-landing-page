
import { useState } from "react";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  Drawer, DrawerClose, DrawerContent, DrawerDescription, 
  DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger 
} from "@/components/ui/drawer";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { 
  TrendingUp, Edit, Archive, Share2, PlusCircle, 
  ChevronDown, ChevronUp
} from "lucide-react";

export default function WinsMoneyMaker() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  
  // Sample money-making ideas - in a real app this would come from an API/database
  const activeIdeas = [
    {
      id: 1,
      name: "Etsy Digital Downloads",
      status: "Active",
      monthlyIncome: 320,
      startDate: "Feb 10, 2025",
      trend: "up",
      growth: 27,
      notes: "Currently averaging $10-15/day with minimal maintenance needed",
      topPerformer: true
    },
    {
      id: 2,
      name: "Freelance Web Design",
      status: "Active",
      monthlyIncome: 950,
      startDate: "Mar 5, 2025",
      trend: "up",
      growth: 12,
      notes: "Taking 2-3 clients per month, about 30 hours of work total",
      topPerformer: true
    },
    {
      id: 3,
      name: "RV Blog",
      status: "Active",
      monthlyIncome: 150,
      startDate: "Jan 15, 2025",
      trend: "up",
      growth: 5,
      notes: "Growing slowly but steadily, mostly affiliate income",
      topPerformer: false
    },
    {
      id: 4,
      name: "YouTube Channel",
      status: "Paused",
      monthlyIncome: 85,
      startDate: "Dec 20, 2024",
      trend: "down",
      growth: -10,
      notes: "On pause while traveling through areas with poor internet",
      topPerformer: false
    }
  ];
  
  const archivedIdeas = [
    {
      id: 5,
      name: "Amazon FBA",
      status: "Archived",
      monthlyIncome: 0,
      startDate: "Oct 15, 2024",
      endDate: "Dec 5, 2024",
      notes: "Too difficult to manage inventory while traveling"
    },
    {
      id: 6,
      name: "Virtual Assistant",
      status: "Archived",
      monthlyIncome: 0,
      startDate: "Sep 3, 2024",
      endDate: "Nov 10, 2024",
      notes: "Found better-paying opportunities that are more flexible"
    }
  ];
  
  // Calculate total monthly income
  const totalMonthlyIncome = activeIdeas.reduce((sum, idea) => sum + idea.monthlyIncome, 0);
  
  // Data for comparison chart
  const chartData = activeIdeas.map(idea => ({
    name: idea.name,
    income: idea.monthlyIncome,
    fill: idea.topPerformer ? '#8B5CF6' : '#0EA5E9'
  }));
  
  return (
    <div className="space-y-6">
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
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Add New Income Source</DrawerTitle>
              <DrawerDescription>
                Track a new way you're making money while traveling
              </DrawerDescription>
            </DrawerHeader>
            <div className="px-4 py-2">
              <form className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <label htmlFor="idea-name">Name</label>
                  <Input id="idea-name" placeholder="What is this income source?" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="status">Status</label>
                  <select 
                    id="status" 
                    className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="planning">Planning</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label htmlFor="monthly-income">Monthly Income ($)</label>
                  <Input id="monthly-income" type="number" placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="start-date">Start Date</label>
                  <Input id="start-date" type="date" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="notes">Notes</label>
                  <textarea 
                    id="notes" 
                    rows={3}
                    placeholder="Additional details about this income source"
                    className="w-full border border-gray-200 rounded-md py-2 px-3 text-sm"
                  ></textarea>
                </div>
              </form>
            </div>
            <DrawerFooter>
              <Button>Save Income Source</Button>
              <DrawerClose asChild>
                <Button variant="outline">Cancel</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Monthly Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalMonthlyIncome}</div>
            <div className="flex items-center gap-1 text-green-600 text-sm mt-1">
              <TrendingUp className="h-4 w-4" />
              <span>+$230 from last month</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Income Streams
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeIdeas.filter(i => i.status === "Active").length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeIdeas.filter(i => i.status === "Paused").length} currently paused
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeIdeas.sort((a, b) => b.monthlyIncome - a.monthlyIncome)[0]?.name}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ${activeIdeas.sort((a, b) => b.monthlyIncome - a.monthlyIncome)[0]?.monthlyIncome}/month
            </p>
          </CardContent>
        </Card>
      </div>
      
      {/* Income comparison chart */}
      <Card>
        <CardHeader>
          <CardTitle>Income Comparison</CardTitle>
          <CardDescription>
            Monthly earnings by source
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Legend />
                <Bar dataKey="income" name="Monthly Income" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      
      {/* Active Income Ideas */}
      <div>
        <h3 className="font-medium text-lg mb-3">Your Active Ideas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeIdeas.map((idea) => (
            <Card key={idea.id} className={`border ${idea.topPerformer ? 'border-purple-200' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {idea.name}
                    {idea.topPerformer && 
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">
                        Top Performer
                      </Badge>
                    }
                    {idea.status === "Paused" && 
                      <Badge variant="outline" className="bg-amber-50 text-amber-800 hover:bg-amber-50 border-amber-200">
                        Paused
                      </Badge>
                    }
                  </CardTitle>
                  <div className="text-right">
                    <div className="text-lg font-bold">${idea.monthlyIncome}</div>
                    <div className="text-xs text-muted-foreground">per month</div>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm mt-1">
                  <span className="text-muted-foreground">Since {idea.startDate}</span>
                  <div className={`ml-auto flex items-center gap-1 ${
                    idea.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {idea.trend === 'up' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span>{Math.abs(idea.growth)}% {idea.trend === 'up' ? 'growth' : 'decrease'}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <p className="text-sm">{idea.notes}</p>
              </CardContent>
              <CardFooter className="pt-0 border-t flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  {idea.status === "Active" ? "Currently active" : "Temporarily paused"}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Archive className="h-4 w-4 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Share2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      
      {/* Archived Ideas (collapsible) */}
      <div>
        <button
          onClick={() => setArchivedOpen(!archivedOpen)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <span>Archived Ideas ({archivedIdeas.length})</span>
          {archivedOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {archivedOpen && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {archivedIdeas.map((idea) => (
              <Card key={idea.id} className="bg-muted/20">
                <CardHeader className="pb-3">
                  <div className="flex justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {idea.name}
                      <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">
                        Archived
                      </Badge>
                    </CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {idea.startDate} - {idea.endDate}
                  </p>
                </CardHeader>
                <CardContent className="pb-3">
                  <p className="text-sm">{idea.notes}</p>
                </CardContent>
                <CardFooter className="pt-0 border-t flex justify-end gap-1">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-blue-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Reactivate
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {/* Pam's Suggestions */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="bg-blue-100 p-1 rounded-full">
              <img 
                src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets/Pam.webp"
                alt="Pam"
                className="h-5 w-5 rounded-full"
              />
            </span>
            <span>Pam's Money-Making Suggestions</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-white rounded-lg border border-blue-100">
            <p className="text-blue-900 font-medium">
              Your Etsy store is growing 70% faster than your other income sources! Want to spend more time on it?
            </p>
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" className="bg-blue-500 hover:bg-blue-600">Show Me How</Button>
              <Button size="sm" variant="outline">Later</Button>
            </div>
          </div>
          
          <div className="p-3 bg-white rounded-lg border border-blue-100">
            <p className="text-blue-900 font-medium">
              3 income ideas that are working for travelers with profiles like yours:
            </p>
            <ul className="mt-2 space-y-2 text-sm list-disc pl-5">
              <li><span className="font-medium">Remote bookkeeping</span> - Average $950/month, 20hrs/week</li>
              <li><span className="font-medium">RV inspections</span> - Average $400/month, flexible schedule</li>
              <li><span className="font-medium">Campground photography</span> - Average $300/month, combines with travel</li>
            </ul>
          </div>
          
          <div className="p-3 bg-white rounded-lg border border-blue-100">
            <p className="text-blue-900 font-medium">
              Your YouTube channel could use some attention - views dropped 32% this month
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Consider scheduling a batch recording day when you reach an area with good internet.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
