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
    <header className={`fixed top-0 left-0 right-0 z-50 h-24 transition-all duration-300 ${baseClass}`}>
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          {children}
        </div>
      </div>
    </header>
  );
};

export default HeaderContainer;
