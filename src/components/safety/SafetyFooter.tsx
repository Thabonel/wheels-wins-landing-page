
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SafetyFooter = () => {
  return (
    <div className="mt-12 flex justify-center">
      <Button asChild size="lg" className="text-base sm:text-lg px-6 sm:px-8 py-4 sm:py-6">
        <Link to="/you">Back to Dashboard</Link>
      </Button>
    </div>
  );
};

export default SafetyFooter;
