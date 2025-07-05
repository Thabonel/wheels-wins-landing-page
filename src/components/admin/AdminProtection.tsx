import React from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { Card, CardContent } from '@/components/ui/card';
import { Shield } from 'lucide-react';

interface AdminProtectionProps {
  children: React.ReactNode;
}

const AdminProtection: React.FC<AdminProtectionProps> = ({ children }) => {
  return (
    <>
      <SignedOut>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
              <p className="text-gray-600 mb-4">Please sign in to access the admin dashboard.</p>
              <SignInButton mode="modal">
                <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">
                  Sign In
                </button>
              </SignInButton>
            </CardContent>
          </Card>
        </div>
      </SignedOut>
      
      <SignedIn>
        <div className="absolute top-4 right-4 z-50">
          <UserButton afterSignOutUrl="/" />
        </div>
        {children}
      </SignedIn>
    </>
  );
};

export default AdminProtection;