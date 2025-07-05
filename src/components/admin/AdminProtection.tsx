import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface AdminProtectionProps {
  children: React.ReactNode;
}

const AdminProtection: React.FC<AdminProtectionProps> = ({ children }) => {
  const { user, isAuthenticated, loading } = useAuth();

  // Simple admin check - in production, this should be more secure
  const adminEmails = ['admin@wheelsandwins.com', 'thabonel0@gmail.com'];
  const isAdmin = user?.email && adminEmails.includes(user.email);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Admin Access Required</h1>
          <p className="text-gray-600 text-center mb-6">
            Please sign in to access the admin dashboard.
          </p>
          <div className="space-y-4">
            <Link to="/auth">
              <Button className="w-full">Sign In</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this admin area.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <span className="text-sm text-gray-500">
              Signed in as: {user.email}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminProtection;