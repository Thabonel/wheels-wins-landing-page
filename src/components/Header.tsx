
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 py-4 bg-black/30 backdrop-blur-sm">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className="h-14 w-52 bg-logo bg-contain bg-no-repeat" aria-label="Wheels & Wins"></div>
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
