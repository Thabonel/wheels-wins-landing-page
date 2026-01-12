import { Quote } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Margaret R.",
      credentials: "Full-time RVer, 3 years",
      location: "Queensland, Australia",
      quote:
        "Saved $400 in my first month just by following PAM's fuel suggestions. The route planner found campgrounds I never would've discovered on my own.",
      initials: "MR",
      rotation: "-2deg",
      pinColor: "bg-secondary",
    },
    {
      name: "Robert & Linda H.",
      credentials: "Grey Nomads, 5 years on the road",
      location: "Victoria, Australia",
      quote:
        "We used to overspend every month and had no idea where the money went. PAM's expense tracking showed us we were wasting $200/month on convenience stops. Now we're saving that instead.",
      initials: "RH",
      rotation: "1deg",
      pinColor: "bg-primary",
    },
    {
      name: "James T.",
      credentials: "Weekend warrior, Class C motorhome",
      location: "New South Wales, Australia",
      quote:
        "The weather alerts saved us from driving into a storm in the Blue Mountains. PAM rerouted us automatically and we found an amazing free camp instead. Worth every cent.",
      initials: "JT",
      rotation: "-1deg",
      pinColor: "bg-accent",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />

      <div className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-light tracking-tight text-foreground mb-4">
            Stories From the{" "}
            <span className="font-medium text-primary">Road</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real travelers sharing their journey with Wheels & Wins
          </p>
        </div>

        {/* Testimonial cards - postcard style */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="relative group"
              style={{
                transform: `rotate(${testimonial.rotation})`,
                "--index": index,
              } as React.CSSProperties}
            >
              {/* Decorative pin/tape element */}
              <div
                className={`
                  absolute -top-3 left-1/2 -translate-x-1/2 z-10
                  w-8 h-8 rounded-full ${testimonial.pinColor}
                  shadow-md flex items-center justify-center
                  transition-transform duration-300 group-hover:scale-110
                `}
              >
                <div className="w-2 h-2 rounded-full bg-white/60" />
              </div>

              {/* Card with postcard styling */}
              <div
                className={`
                  bg-card rounded-sm p-6 pt-8
                  shadow-warm border border-border/30
                  transition-all duration-300 ease-out
                  hover:shadow-warm-lg hover:-translate-y-1
                  ${index === 1 ? "md:-mt-4" : ""}
                `}
              >
                {/* Large decorative quote */}
                <div className="absolute top-6 right-6 opacity-10">
                  <Quote className="w-12 h-12 text-primary" />
                </div>

                {/* Quote text */}
                <blockquote className="relative mb-6">
                  <p className="text-foreground leading-relaxed text-base">
                    "{testimonial.quote}"
                  </p>
                </blockquote>

                {/* Divider - postcard line */}
                <div className="border-t border-dashed border-border/50 my-4" />

                {/* Author info */}
                <div className="flex items-center gap-4">
                  {/* Avatar with initials */}
                  <div
                    className={`
                      flex-shrink-0 w-12 h-12 rounded-full
                      bg-muted flex items-center justify-center
                      text-sm font-display font-medium text-muted-foreground
                      border-2 border-border/30
                    `}
                  >
                    {testimonial.initials}
                  </div>

                  {/* Name and details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-medium text-foreground truncate">
                      {testimonial.name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {testimonial.credentials}
                    </p>
                    <p className="text-xs text-muted-foreground/70 truncate">
                      {testimonial.location}
                    </p>
                  </div>
                </div>

                {/* Postcard stamp decoration */}
                <div className="absolute bottom-4 right-4 opacity-20">
                  <div className="w-10 h-10 border-2 border-primary rounded-sm flex items-center justify-center transform rotate-12">
                    <span className="text-[8px] font-display font-medium text-primary tracking-wider">
                      W&W
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom accent - subtle road line */}
        <div className="mt-16 flex justify-center">
          <div className="flex items-center gap-2">
            <div className="w-12 h-0.5 bg-border rounded-full" />
            <div className="w-2 h-2 rounded-full bg-secondary/50" />
            <div className="w-24 h-0.5 bg-border rounded-full" />
            <div className="w-2 h-2 rounded-full bg-secondary/50" />
            <div className="w-12 h-0.5 bg-border rounded-full" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
