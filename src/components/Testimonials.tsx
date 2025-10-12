import { Card, CardContent } from "@/components/ui/card";

const Testimonials = () => {
  const testimonials = [{
    name: "Margaret R.",
    location: "Retired Nomad, 68",
    quote: "Pam helped us keep travelling longer without money stress — and we've made real friends along the way."
  }, {
    name: "Robert & Linda",
    location: "Canada",
    quote: "I used to worry about costs. Now Pam tracks it all, and we've met other Snowbirds through the app."
  }, {
    name: "James T.",
    location: "Full-time RVer, 72",
    quote: "Feels like travelling with a team — Pam for planning, and a community that always waves back."
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