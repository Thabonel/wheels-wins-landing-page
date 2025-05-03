import { Card, CardContent } from "@/components/ui/card";
const testimonials = [{
  name: "Margaret R.",
  location: "Retired Nomad, 68",
  quote: "Wheels and Wins has transformed how I travel. The budgeting tools alone have saved me hundreds!"
}, {
  name: "Robert & Linda",
  location: "Snowbirds from Canada",
  quote: "We've discovered amazing spots we never would have found without this community. Worth every penny."
}, {
  name: "James T.",
  location: "Full-time RVer, 72",
  quote: "Having Pam as my travel companion gives me confidence to explore new areas I wouldn't have tried before."
}];
const Testimonials = () => {
  return <section className="py-20 bg-transparent">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          What Our Members Are Saying
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => <Card key={index} className="bg-muted border-none shadow-md">
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