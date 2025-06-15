
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const LoginButton = () => {
  return (
    <Link to="/auth">
      <Button variant="outline" className="bg-white text-primary border-primary hover:bg-primary/10">
        Login
      </Button>
    </Link>
  );
};

export default LoginButton;
