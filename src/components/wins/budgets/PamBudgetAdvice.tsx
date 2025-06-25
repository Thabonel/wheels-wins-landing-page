
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

export default function PamBudgetAdvice() {
  return (
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
  );
}
