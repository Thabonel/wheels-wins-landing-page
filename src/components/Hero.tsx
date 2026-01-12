import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="w-full min-h-[90vh] bg-background relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23370808' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      }} />

      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-16 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Content - Left side */}
          <div className="lg:col-span-6 space-y-6 md:space-y-8">
            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-display font-light tracking-tight text-foreground leading-[1.1] animate-fade-in-up">
              Plan RV Trips That{" "}
              <span className="font-medium text-primary">Save Money</span>, Not Waste It
            </h1>

            {/* Tagline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Smart route planning and expense tracking for full-time RVers who want more adventure, less stress.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
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
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-3 pt-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground"
                  >
                    {['JD', 'MK', 'SA', 'TL'][i - 1]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">10,000+</span> travelers already planning smarter
              </p>
            </div>
          </div>

          {/* Featured Image - Right side */}
          <div className="lg:col-span-6 relative animate-scale-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              {/* Decorative element behind image */}
              <div className="absolute -inset-4 bg-accent/10 rounded-3xl transform rotate-2" />

              {/* Main image */}
              <div className="relative rounded-2xl overflow-hidden shadow-warm-lg">
                <img
                  src="/images/hero-unimog-fire.jpg"
                  alt="RV adventure by campfire at sunset"
                  className="w-full h-auto object-cover aspect-[4/3]"
                />
                {/* Subtle gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/10 to-transparent" />
              </div>

              {/* Floating badge */}
              <div className="absolute -bottom-4 -left-4 md:-left-8 bg-card rounded-xl px-4 py-3 shadow-warm-lg border border-border animate-float">
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground">$2,400 saved</p>
                  <p className="text-xs text-muted-foreground">Average annual savings</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
