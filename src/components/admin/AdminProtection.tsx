import React from 'react';

interface AdminProtectionProps {
  children: React.ReactNode;
}

const AdminProtection: React.FC<AdminProtectionProps> = ({ children }) => {
  // No authentication - open access to admin panel
  return <>{children}</>;
};

export default AdminProtection;