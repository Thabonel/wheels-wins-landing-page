
import { useState } from "react";
import { Menu } from "lucide-react";

// This is a placeholder for future mobile menu implementation
const MobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex md:hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="text-gray-500 hover:text-blue-600 transition"
      >
        <Menu size={24} />
      </button>
      
      {/* Mobile menu drawer implementation can go here in the future */}
    </div>
  );
};

export default MobileMenu;
