
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

const PricingPlans = () => {
  return (
    <section className="py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Adventure</h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Select the perfect plan to maximize your travel experience with Pam's help.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Trial Plan */}
          <Card className="border-2 border-primary/20 flex flex-col">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">First Month Free</CardTitle>
              <CardDescription className="text-sm">Try before you commit</CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-4 flex-grow">
              <div className="mb-6">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-muted-foreground ml-1">for 30 days</span>
              </div>
              <ul className="space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Full access to our platform and community</span>
                </li>
                <li className="flex items-start text-muted-foreground">
                  <span className="h-5 w-5 mr-2 flex-shrink-0">*</span>
                  <span>Video Course not included</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-primary hover:bg-primary/90">Get Started</Button>
            </CardFooter>
          </Card>

          {/* Monthly Plan */}
          <Card className="border-2 border-primary/20 flex flex-col">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Monthly Membership</CardTitle>
              <CardDescription className="text-sm">Full access to our platform and community</CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-4 flex-grow">
              <div className="mb-6">
                <span className="text-4xl font-bold">$18</span>
                <span className="text-muted-foreground ml-1">/month</span>
              </div>
              <ul className="space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Full access to our platform and community</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-primary hover:bg-primary/90">Select Plan</Button>
            </CardFooter>
          </Card>

          {/* Annual Plan */}
          <Card className="border-2 border-accent flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-accent text-accent-foreground px-3 py-1 text-xs font-semibold">
              Best Value
            </div>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl">Annual Membership</CardTitle>
              <CardDescription className="text-sm">Save 33% plus get the $97 Video Course FREE</CardDescription>
            </CardHeader>
            <CardContent className="text-center pb-4 flex-grow">
              <div className="mb-6">
                <span className="text-4xl font-bold">$216</span>
                <span className="text-muted-foreground ml-1">/year</span>
              </div>
              <ul className="space-y-2 text-left">
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Full access to our platform and community</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
                  <span>Includes Video Course ($97 value)</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-accent hover:bg-accent/90">Select Plan</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default PricingPlans;
