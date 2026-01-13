import { useRef } from "react";
import { motion, useInView } from "framer-motion";

const Testimonials = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const testimonials = [
    {
      name: "Margaret R.",
      credentials: "Full-time RVer, 3 years",
      location: "Queensland, Australia",
      quote:
        "The route planner found campgrounds I never would've discovered on my own. Makes trip planning so much easier.",
      initials: "MR",
      rotation: "-2deg",
      pinColor: "bg-secondary",
    },
    {
      name: "Robert & Linda H.",
      credentials: "Grey Nomads, 5 years on the road",
      location: "Victoria, Australia",
      quote:
        "We used to have no idea where our money was going each month. PAM's expense tracking helps us see exactly what we're spending on fuel, food, and camping.",
      initials: "RH",
      rotation: "1deg",
      pinColor: "bg-primary",
    },
    {
      name: "James T.",
      credentials: "Weekend warrior, Class C motorhome",
      location: "New South Wales, Australia",
      quote:
        "Having all my trip planning and expenses in one place is a game changer. No more spreadsheets or guesswork.",
      initials: "JT",
      rotation: "-1deg",
      pinColor: "bg-accent",
    },
  ];

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50, rotate: 0 },
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
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-20 left-10 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-secondary/10 rounded-full blur-3xl" />

      <div ref={sectionRef} className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section header */}
        <motion.div
          className="text-center mb-16 md:mb-20"
          variants={headerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-light tracking-tight text-foreground mb-4">
            Stories From the{" "}
            <span className="font-medium text-primary">Road</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real travelers sharing their journey with Wheels & Wins
          </p>
        </motion.div>

        {/* Testimonial cards - postcard style */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              className="relative group"
              variants={cardVariants}
              style={{
                "--index": index,
              } as React.CSSProperties}
              whileInView={{
                rotate: testimonial.rotation,
              }}
              viewport={{ once: true }}
            >
              {/* Decorative pin/tape element */}
              <motion.div
                className={`
                  absolute -top-3 left-1/2 -translate-x-1/2 z-10
                  w-8 h-8 rounded-full ${testimonial.pinColor}
                  shadow-md flex items-center justify-center
                  transition-transform duration-300 group-hover:scale-110
                `}
                initial={{ scale: 0, opacity: 0 }}
                animate={isInView ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                transition={{
                  delay: 0.5 + index * 0.15,
                  duration: 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94] as const,
                }}
              >
                <div className="w-2 h-2 rounded-full bg-white/60" />
              </motion.div>

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
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom accent - subtle road line */}
        <motion.div
          className="mt-16 flex justify-center"
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : { opacity: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-12 h-0.5 bg-border rounded-full" />
            <div className="w-2 h-2 rounded-full bg-secondary/50" />
            <div className="w-24 h-0.5 bg-border rounded-full" />
            <div className="w-2 h-2 rounded-full bg-secondary/50" />
            <div className="w-12 h-0.5 bg-border rounded-full" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Testimonials;
