import { Card, CardContent } from "@/components/ui/card";

const Testimonials = () => {
  const testimonials = [{
    name: "Margaret R.",
    credentials: "Full-time RVer, 3 years",
    location: "Queensland, Australia",
    quote: "Saved $400 in my first month just by following PAM's fuel suggestions. The route planner found campgrounds I never would've discovered on my own.",
    initials: "MR"
  }, {
    name: "Robert & Linda H.",
    credentials: "Grey Nomads, 5 years on the road",
    location: "Victoria, Australia",
    quote: "We used to overspend every month and had no idea where the money went. PAM's expense tracking showed us we were wasting $200/month on convenience stops. Now we're saving that instead.",
    initials: "RH"
  }, {
    name: "James T.",
    credentials: "Weekend warrior, Class C motorhome",
    location: "New South Wales, Australia",
    quote: "The weather alerts saved us from driving into a storm in the Blue Mountains. PAM rerouted us automatically and we found an amazing free camp instead. Worth every cent.",
    initials: "JT"
  }];

  return <section className="py-20 bg-transparent">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
          Why Travellers Love Pam & Wheels and Wins
        </h2>

        <p className="text-xl text-center mb-16 max-w-3xl mx-auto text-muted-foreground">
          Stories from the Road
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => <Card key={index} className="bg-muted/20 border-primary/10 shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold">
                    {testimonial.initials}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.credentials}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                  </div>
                </div>
                <p className="text-base leading-relaxed italic text-gray-700">"{testimonial.quote}"</p>
              </CardContent>
            </Card>)}
        </div>
      </div>
    </section>;
};
export default Testimonials;