import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const Hero = () => {
  // Animation variants for staggered entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
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

  const imageVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.25, 0.46, 0.45, 0.94] as const,
        delay: 0.3,
      },
    },
  };

  return (
    <section className="w-full min-h-[90vh] bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23370808' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-16 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Content - Left side */}
          <motion.div
            className="lg:col-span-6 space-y-6 md:space-y-8"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-display font-light tracking-tight text-foreground leading-[1.1]"
            >
              Plan RV Trips That{" "}
              <span className="font-medium text-primary">Save Money</span>, Not Waste It
            </motion.h1>

            {/* Tagline */}
            <motion.p
              variants={itemVariants}
              className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed"
            >
              Smart route planning and expense tracking for full-time RVers who want more adventure, less stress.
            </motion.p>

            {/* CTA */}
            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 pt-2"
            >
              <Link to="/signup">
                <Button
                  size="lg"
                  className="text-lg font-medium px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 btn-editorial shadow-warm"
                >
                  Start Free for 30 Days
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg font-medium px-8 py-6 border-border hover:bg-muted"
                >
                  See How It Works
                </Button>
              </a>
            </motion.div>

            {/* Social proof */}
            <motion.div
              variants={itemVariants}
              className="flex items-center gap-3 pt-4"
            >
              <p className="text-sm text-muted-foreground">
                Join RVers across Australia planning smarter trips
              </p>
            </motion.div>
          </motion.div>

          {/* Featured Image - Right side */}
          <motion.div
            className="lg:col-span-6 relative"
            variants={imageVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="relative">
              {/* Decorative element behind image */}
              <div className="absolute -inset-4 bg-accent/10 rounded-3xl transform rotate-2" />

              {/* Main image - optimized with WebP and responsive sizes */}
              <div className="relative rounded-2xl overflow-hidden shadow-warm-lg">
                <img
                  src="/Closeup_of_mudcovered.gif"
                  alt="RV adventure by campfire at sunset"
                  className="w-full h-auto object-cover aspect-[4/3]"
                  fetchPriority="high"
                />
                {/* Subtle gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 to-transparent" />
              </div>

              {/* Floating badge */}
              <motion.div
                className="absolute -bottom-4 -left-4 md:-left-8 bg-card rounded-xl px-4 py-3 shadow-warm-lg border border-border"
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  y: [0, -10, 0],
                }}
                transition={{
                  opacity: { duration: 0.5, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const },
                  x: { duration: 0.5, delay: 0.8, ease: [0.25, 0.46, 0.45, 0.94] as const },
                  y: { duration: 6, ease: "easeInOut", repeat: Infinity, delay: 1.3 },
                }}
              >
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">30-day free trial</p>
                  <p className="text-xs text-muted-foreground">No credit card required</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
