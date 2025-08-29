
import { ReactNode } from "react";

interface HeaderContainerProps {
  children: ReactNode;
  isHomePage: boolean;
  isScrolled: boolean;
}

const HeaderContainer = ({ children, isHomePage, isScrolled }: HeaderContainerProps) => {
  const baseClass =
    isHomePage && !isScrolled
      ? "bg-transparent"
      : isHomePage && isScrolled
      ? "bg-white/90 backdrop-blur-sm shadow-sm"
      : "bg-white shadow-sm";

  return (
    <header className={`sticky top-0 z-50 h-[var(--header-height)] transition-all duration-300 ${baseClass} supports-[position:sticky]:sticky`}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          {children}
        </div>
      </div>
    </header>
  );
};

export default HeaderContainer;
