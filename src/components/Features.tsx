import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
const features = [{
  title: "Track Your Travel Budget",
  description: "Easily manage expenses specific to life on the road, from fuel costs to campsite fees."
}, {
  title: "Plan Perfect Routes",
  description: "Discover scenic destinations, hidden gems, and RV-friendly stops along your journey."
}, {
  title: "Connect with Fellow Travelers",
  description: "Join a community of experienced roadtrippers who share tips, stories, and meet-ups."
}, {
  title: "AI Travel Companion",
  description: "Ask Pam any travel question and get personalized recommendations for your adventure."
}];
const Features = () => {
  return <section className="py-20 bg-transparent">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Everything You Need for Life on the Road
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => <Card key={index} className="border-2 border-primary/10 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-center">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-center text-muted-foreground text-lg">{feature.description}</p>
              </CardContent>
            </Card>)}
        </div>
      </div>
    </section>;
};
export default Features;