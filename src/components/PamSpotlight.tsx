import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { getPublicAssetUrl } from "@/utils/publicAssets";

const PamSpotlight = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });

  const features = [
    "Route Planning",
    "Budget Tracking",
    "Community Connect",
    "Smart Suggestions",
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.95, x: -30 },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: {
        duration: 0.7,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
      },
    },
  };

  return (
    <section className="py-20 md:py-28 bg-card relative overflow-hidden">
      {/* Subtle paper texture background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-accent/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

      <div ref={sectionRef} className="container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Image side - organic blob shape */}
          <motion.div
            className="w-full lg:w-5/12 order-2 lg:order-1"
            variants={imageVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <div className="relative">
              {/* Decorative blob shape behind image */}
              <svg
                className="absolute -inset-4 w-[calc(100%+2rem)] h-[calc(100%+2rem)] text-secondary/20"
                viewBox="0 0 200 200"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fill="currentColor"
                  d="M47.1,-57.2C59.5,-47.3,67.1,-31.3,70.2,-14.4C73.3,2.6,71.9,20.4,63.8,34.3C55.7,48.2,40.9,58.1,24.6,64.1C8.3,70.1,-9.5,72.1,-26.3,68.1C-43.1,64.1,-58.9,54,-67.3,39.7C-75.7,25.4,-76.7,6.9,-72.3,-9.3C-67.9,-25.5,-58.1,-39.4,-45.1,-49.2C-32.1,-59,-16,-64.7,0.8,-65.7C17.7,-66.7,35.4,-62.9,47.1,-57.2Z"
                  transform="translate(100 100)"
                />
              </svg>

              {/* Video container with organic border */}
              <div className="relative rounded-[2rem] overflow-hidden shadow-warm-lg border-4 border-card">
                <video
                  src={getPublicAssetUrl("images/Pam.mp4")}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto object-cover aspect-square"
                />
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
              </div>
            </div>
          </motion.div>

          {/* Content side */}
          <motion.div
            className="w-full lg:w-7/12 order-1 lg:order-2"
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
          >
            <motion.h2
              variants={itemVariants}
              className="text-3xl md:text-4xl lg:text-5xl font-display font-light tracking-tight text-foreground mb-6"
            >
              Meet <span className="font-medium text-primary">Pam</span> - Your
              AI Travel Companion
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-muted-foreground leading-relaxed mb-8"
            >
              Pam handles the details so you can live the dream. She helps plan
              routes, tracks your budget, and connects you with like-minded
              travelers - your personal AI assistant for life on the road.
            </motion.p>

            {/* Feature badges - text only */}
            <motion.div variants={itemVariants} className="flex flex-wrap gap-3 mb-8">
              {features.map((feature, index) => (
                <motion.span
                  key={index}
                  className="px-4 py-2 rounded-full bg-muted/50 border border-border/50 text-sm font-medium text-foreground"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                  transition={{
                    duration: 0.4,
                    delay: 0.4 + index * 0.1,
                    ease: [0.25, 0.46, 0.45, 0.94] as const,
                  }}
                >
                  {feature}
                </motion.span>
              ))}
            </motion.div>

            {/* Quote highlight */}
            <motion.div
              variants={itemVariants}
              className="relative pl-6 border-l-2 border-accent"
            >
              <p className="text-base italic text-muted-foreground">
                "Like having a knowledgeable friend who's always got your back
                on the road"
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PamSpotlight;
