
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  return (
    <div className="flex md:hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="text-gray-500 hover:text-blue-600 transition p-2"
        aria-label="Toggle mobile menu"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      {/* Mobile menu drawer */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu panel */}
          <div className="fixed top-0 right-0 h-full w-72 bg-white shadow-lg z-50 transform transition-transform duration-300">
            <div className="p-6">
              {/* Close button */}
              <div className="flex justify-end mb-6">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="text-gray-500 hover:text-gray-700 p-2"
                >
                  <X size={24} />
                </button>
              </div>
              
              {/* Navigation links */}
              <nav className="space-y-4">
                {user ? (
                  <>
                    <Link 
                      to="/you" 
                      className="block text-lg font-medium text-gray-900 hover:text-blue-600 py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <Link 
                      to="/wheels" 
                      className="block text-lg font-medium text-gray-900 hover:text-blue-600 py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Wheels
                    </Link>
                    <Link 
                      to="/wins" 
                      className="block text-lg font-medium text-gray-900 hover:text-blue-600 py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Wins
                    </Link>
                    <Link 
                      to="/social" 
                      className="block text-lg font-medium text-gray-900 hover:text-blue-600 py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Social
                    </Link>
                    <Link 
                      to="/shop" 
                      className="block text-lg font-medium text-gray-900 hover:text-blue-600 py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Gear
                    </Link>
                    <Link 
                      to="/profile" 
                      className="block text-lg font-medium text-gray-900 hover:text-blue-600 py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Profile
                    </Link>
                    <div className="pt-4 border-t border-gray-200">
                      <Button 
                        onClick={handleSignOut}
                        variant="outline"
                        className="w-full"
                      >
                        Sign Out
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Link 
                      to="/shop" 
                      className="block text-lg font-medium text-gray-900 hover:text-blue-600 py-2"
                      onClick={() => setIsOpen(false)}
                    >
                      Gear
                    </Link>
                    <div className="space-y-3 pt-4">
                      <Link to="/login" onClick={() => setIsOpen(false)}>
                        <Button variant="outline" className="w-full">
                          Login
                        </Button>
                      </Link>
                      <Link to="/signup" onClick={() => setIsOpen(false)}>
                        <Button className="w-full">
                          Sign Up
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </nav>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MobileMenu;
