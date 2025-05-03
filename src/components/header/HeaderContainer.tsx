
import { ReactNode } from "react";

interface HeaderContainerProps {
  children: ReactNode;
  isScrolled: boolean;
  isHomePage: boolean;
}

const HeaderContainer = ({ children, isScrolled, isHomePage }: HeaderContainerProps) => {
  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-24 ${
        isScrolled && isHomePage 
          ? "bg-white/90 backdrop-blur-sm shadow-sm" 
          : isHomePage 
            ? "bg-transparent" 
            : "bg-white/90 backdrop-blur-sm shadow-sm"
      }`}
    >
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          {children}
        </div>
      </div>
    </header>
  );
};

export default HeaderContainer;
