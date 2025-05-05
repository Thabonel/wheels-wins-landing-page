
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const SafetyFooter = () => {
  return (
    <div className="mt-8 flex justify-center">
      <Button asChild size="lg" className="text-base">
        <Link to="/you">Back to Dashboard</Link>
      </Button>
    </div>
  );
};

export default SafetyFooter;
