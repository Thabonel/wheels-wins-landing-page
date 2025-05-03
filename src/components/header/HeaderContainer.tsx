
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface HeaderContainerProps {
  children: ReactNode;
  isScrolled: boolean;
  isHomePage: boolean;
}

const HeaderContainer = ({ children, isScrolled, isHomePage }: HeaderContainerProps) => {
  const headerClasses = cn(
    "fixed top-0 left-0 right-0 z-50 transition-all duration-300 h-24",
    isHomePage && !isScrolled 
      ? "bg-transparent text-white" 
      : "bg-white text-gray-900 shadow-sm"
  );

  return (
    <header className={headerClasses}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          {children}
        </div>
      </div>
    </header>
  );
};

export default HeaderContainer;
