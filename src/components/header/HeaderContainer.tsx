
import React from "react";

interface HeaderContainerProps {
  children: React.ReactNode;
}

const HeaderContainer = ({ children }: HeaderContainerProps) => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-24 transition-all duration-300 bg-transparent">
      <div className="container max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {children}
      </div>
    </header>
  );
};

export default HeaderContainer;
