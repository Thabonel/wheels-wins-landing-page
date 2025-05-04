
import { 
  Card, CardContent, CardFooter, CardHeader, CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Accordion, AccordionContent, AccordionItem, AccordionTrigger 
} from "@/components/ui/accordion";
import { DollarSign, Settings } from "lucide-react";

export default function WinsBudgets() {
  // Sample budget data - in a real app this would come from an API/database
  const budgetCategories = [
    { 
      id: 1, 
      name: "Fuel", 
      budgeted: 500, 
      spent: 350, 
      remaining: 150,
      progress: 70,
      color: "bg-purple-600",
      status: "on-track"
    },
    { 
      id: 2, 
      name: "Food", 
      budgeted: 600, 
      spent: 450, 
      remaining: 150,
      progress: 75,
      color: "bg-blue-600",
      status: "on-track"
    },
    { 
      id: 3, 
      name: "Camp", 
      budgeted: 400, 
      spent: 300, 
      remaining: 100,
      progress: 75,
      color: "bg-green-600",
      status: "on-track"
    },
    { 
      id: 4, 
      name: "Fun", 
      budgeted: 200, 
      spent: 236, 
      remaining: -36,
      progress: 118,
      color: "bg-amber-600",
      status: "over-budget"
    },
    { 
      id: 5, 
      name: "Other", 
      budgeted: 100, 
      spent: 42, 
      remaining: 58,
      progress: 42,
      color: "bg-gray-600",
      status: "on-track"
    },
  ];
  
  // Total budget summary
  const totalBudget = budgetCategories.reduce((sum, item) => sum + item.budgeted, 0);
  const totalSpent = budgetCategories.reduce((sum, item) => sum + item.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalProgress = Math.round((totalSpent / totalBudget) * 100);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Monthly Budgets</h2>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Edit Budgets
        </Button>
      </div>
      
      {/* Overall Budget Card */}
      <Card className="border-2 border-blue-100">
        <CardHeader>
          <CardTitle>Total Monthly Budget</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-sm">
            <span>Progress: {totalProgress}%</span>
            <span>
              <span className="font-medium">${totalSpent}</span> 
              <span className="text-muted-foreground"> of ${totalBudget}</span>
            </span>
          </div>
          <Progress value={totalProgress} className="h-3" />
          
          <div className="grid grid-cols-3 gap-4 pt-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Budgeted</span>
              <span className="text-2xl font-bold">${totalBudget}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Spent</span>
              <span className="text-2xl font-bold">${totalSpent}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className={`text-2xl font-bold ${totalRemaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${totalRemaining}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Category Budget Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {budgetCategories.map((category) => (
          <Card key={category.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex justify-between">
                <span>{category.name}</span>
                <span className="text-muted-foreground">${category.budgeted}</span>
              </CardTitle>
              <div className="flex justify-between text-sm">
                <span>Progress: {category.progress}%</span>
                <span>
                  <span className="font-medium">${category.spent}</span> 
                  <span className="text-muted-foreground"> of ${category.budgeted}</span>
                </span>
              </div>
              <Progress 
                value={category.progress} 
                className={`h-2 ${category.progress > 100 ? 'bg-muted [&>div]:bg-red-500' : ''}`}
              />
            </CardHeader>
            <CardContent className="pb-2">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-muted-foreground">Remaining</div>
                  <div className={`font-bold ${category.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${Math.abs(category.remaining)}
                    {category.remaining < 0 && " over budget"}
                  </div>
                </div>
                
                <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  category.remaining >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <DollarSign className={`h-4 w-4 ${
                    category.remaining >= 0 ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/20 p-2">
              <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground">
                View Transactions
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* Pam's Budget Advice */}
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
            <span>Pam's Budget Advice</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="fun-budget">
              <AccordionTrigger className="text-red-600 font-medium">
                You're over on Fun spending
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground mb-2">
                  You've spent $36 more than budgeted for Fun this month. 
                  Here are some ways to balance this out:
                </p>
                <ul className="space-y-2 text-sm pl-5 list-disc">
                  <li>Look for free attractions in your next destination</li>
                  <li>Consider reducing your Camp spending - I found 3 free boondocking spots along your route</li>
                  <li>Increase your Fun budget by $50 - you have room in your overall budget</li>
                </ul>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="default">Show Free Activities</Button>
                  <Button size="sm" variant="outline">Adjust Budget</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="savings-idea">
              <AccordionTrigger className="text-blue-700 font-medium">
                Camp savings opportunity
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">
                  You've been staying at campgrounds that average $35/night. I found several 
                  highly-rated options along your next route for only $22/night.
                  This could save you $91 over the next week if you're interested.
                </p>
                <div className="mt-4">
                  <Button size="sm" variant="default">View Cheaper Campgrounds</Button>
                </div>
              </AccordionContent>
            </AccordionItem>
            
            <AccordionItem value="spending-trend">
              <AccordionTrigger className="text-green-700 font-medium">
                Your food budget is on track!
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">
                  Great job keeping your food expenses in check! Your grocery shopping 
                  instead of dining out is really paying off. At this rate, you'll have
                  about $150 left in your food budget at month end.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
