import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CallToAction = () => {
  return (
    <section className="py-20 bg-primary text-primary-foreground">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">
          Join the Wheels and Wins Community
        </h2>

        <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto opacity-90">
          Wherever the road takes you, you're never alone, and Pam's always got your back.
        </p>

        <Link to="/signup">
          <Button
            size="lg"
            className="text-xl font-semibold px-10 py-7 bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Start Free for 30 Days
          </Button>
        </Link>
      </div>
    </section>
  );
};

export default CallToAction;
