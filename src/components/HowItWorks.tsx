import { Map, DollarSign, Users } from "lucide-react";

const HowItWorks = () => {
  const features = [
    {
      number: "01",
      icon: Users,
      title: "Community that Travels With You",
      description: "Stay connected with other nomads - share tips, meet up on the road, and always have friends nearby.",
      color: "secondary",
    },
    {
      number: "02",
      icon: DollarSign,
      title: "See Where Your Money Goes",
      description: "Pam tracks expenses, spots where you're overspending, and helps you save on gas and camping.",
      color: "primary",
    },
    {
      number: "03",
      icon: Map,
      title: "Routes That Actually Work",
      description: "Skip the problems. Find scenic routes and great spots that fit your RV and travel style.",
      color: "accent",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-card relative overflow-hidden">
      {/* Subtle decorative background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
        <div className="text-center mb-16 md:mb-20">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-light tracking-tight text-foreground mb-4">
            What Makes Us{" "}
            <span className="font-medium text-primary">Different</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built by RVers, for RVers - we understand the journey.
          </p>
        </div>

        {/* Features grid with staggered layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            const isMiddle = index === 1;

            return (
              <div
                key={index}
                className={`relative group ${isMiddle ? "md:-mt-4" : ""}`}
                style={{ "--index": index } as React.CSSProperties}
              >
                {/* Card */}
                <div
                  className={`
                    relative bg-background rounded-2xl p-8 shadow-warm
                    border border-border/50
                    transition-all duration-300 ease-out
                    hover:shadow-warm-lg hover:-translate-y-1
                    ${index === 0 ? "md:rotate-[-1deg]" : ""}
                    ${index === 2 ? "md:rotate-[1deg]" : ""}
                  `}
                >
                  {/* Number indicator */}
                  <span className="absolute -top-3 -left-2 text-6xl font-display font-light text-muted/40 select-none">
                    {feature.number}
                  </span>

                  {/* Icon */}
                  <div
                    className={`
                      w-14 h-14 rounded-xl mb-6 flex items-center justify-center
                      ${feature.color === "primary" ? "bg-primary/10" : ""}
                      ${feature.color === "secondary" ? "bg-secondary/10" : ""}
                      ${feature.color === "accent" ? "bg-accent/20" : ""}
                    `}
                  >
                    <Icon
                      className={`
                        w-7 h-7
                        ${feature.color === "primary" ? "text-primary" : ""}
                        ${feature.color === "secondary" ? "text-secondary" : ""}
                        ${feature.color === "accent" ? "text-accent-foreground" : ""}
                      `}
                    />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-display font-medium text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
