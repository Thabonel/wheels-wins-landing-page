import React from 'react';

// Disabled PAM provider that prevents PAM from loading
export const DisabledPamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export default DisabledPamProvider;