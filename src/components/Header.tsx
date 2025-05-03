
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogIn } from "lucide-react";

const Header = () => {
  // Check if user data is available (from Dashboard.tsx)
  const isLoggedIn = window.location.pathname === '/dashboard';
  
  return (
    <header className="bg-white py-4">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo on the far left */}
          <div className="flex items-center">
            <img 
              src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//wheels%20and%20wins%20Logo%20alpha.png" 
              alt="Wheels & Wins Logo" 
              className="h-14 object-contain bg-transparent" 
            />
          </div>
          
          {/* Navigation tabs centered horizontally */}
          <div className="hidden md:flex items-center justify-center flex-1">
            <nav className="flex space-x-8">
              {["You", "Wheels", "Wins", "Social", "Shop"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-lg font-semibold text-gray-700 hover:underline decoration-2 decoration-primary"
                >
                  {item}
                </a>
              ))}
            </nav>
          </div>
          
          {/* User profile or login button on the far right */}
          <div className="flex items-center">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-base font-medium">John</span>
                <Avatar className="h-8 w-8">
                  <AvatarImage src="https://kycoklimpzkyrecbjecn.supabase.co/storage/v1/object/public/public-assets//avatar-placeholder.png" alt="John" />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </div>
            ) : (
              <Button variant="secondary" className="text-lg font-semibold flex items-center gap-2 px-6 py-5">
                <LogIn size={20} />
                <span>Log In</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
