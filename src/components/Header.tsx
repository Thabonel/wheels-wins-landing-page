
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

const Header = () => {
  return (
    <header className="absolute top-0 left-0 right-0 z-10 py-6">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-md">
              Wheels & Wins
            </h1>
          </div>
          <div>
            <Button 
              variant="secondary" 
              className="text-lg font-semibold flex items-center gap-2 px-6 py-5"
            >
              <LogIn size={20} />
              <span>Log In</span>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
