import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const HowItWorks = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const features = [
    {
      number: "01",
      title: "Community that Travels With You",
      description: "Stay connected with other nomads - share tips, meet up on the road, and always have friends nearby.",
      color: "secondary",
    },
    {
      number: "02",
      title: "See Where Your Money Goes",
      description: "Pam tracks expenses, spots where you're overspending, and helps you save on gas and camping.",
      color: "primary",
    },
    {
      number: "03",
      title: "Routes That Actually Work",
      description: "Skip the problems. Find scenic routes and great spots that fit your RV and travel style.",
      color: "accent",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const headerVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-card relative overflow-hidden">
      {/* Subtle decorative background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />

      <div ref={sectionRef} className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
        <motion.div
          className="text-center mb-16 md:mb-20"
          variants={headerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-light tracking-tight text-foreground mb-4">
            What Makes Us{" "}
            <span className="font-medium text-primary">Different</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built by RVers, for RVers - we understand the journey.
          </p>
        </motion.div>

        {/* Features grid with staggered layout */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {features.map((feature, index) => {
            const isMiddle = index === 1;

            return (
              <motion.div
                key={index}
                className={`relative group ${isMiddle ? "md:-mt-4" : ""}`}
                variants={cardVariants}
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
                  <span className="text-5xl font-display font-light text-muted-foreground/30 mb-4 block">
                    {feature.number}
                  </span>

                  {/* Content */}
                  <h3 className="text-xl font-display font-medium text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;
