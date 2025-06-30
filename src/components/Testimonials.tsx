import { Card, CardContent } from "@/components/ui/card";
const testimonials = [{
  name: "Margaret R.",
  location: "Retired Nomad, 68",
  quote: "Pam has been my travel buddy for 6 months now. She's helped me plan routes that avoid heavy traffic and finds the coziest diners along the way!"
}, {
  name: "Robert & Linda",
  location: "Snowbirds from Canada",
  quote: "We love how Pam keeps track of our expenses. No more spreadsheets! She even reminds us when it's time to get the RV serviced."
}, {
  name: "James T.",
  location: "Full-time RVer, 72",
  quote: "I was hesitant about using an AI assistant at my age, but Pam is so easy to talk to. She's helped me connect with other travelers in each new town."
}];
const Testimonials = () => {
  return <section className="py-20 bg-transparent">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-6">
          Why Travelers Love Pam
        </h2>
        
        <p className="text-xl text-center mb-16 max-w-3xl mx-auto text-muted-foreground">Join thousands of travelers who've discovered easier, more enjoyable journeys</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => <Card key={index} className="bg-muted/20 border-primary/10 shadow-md">
              <CardContent className="pt-6">
                <p className="text-lg mb-6 italic">"{testimonial.quote}"</p>
                <p className="font-semibold">{testimonial.name}</p>
                <p className="text-muted-foreground">{testimonial.location}</p>
              </CardContent>
            </Card>)}
        </div>
      </div>
    </section>;
};
export default Testimonials;