import React from 'react';
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/clerk-react";

export default function ClerkAuth() {
  return (
    <div className="flex items-center gap-4">
      <SignedOut>
        <SignInButton>
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Sign In
          </button>
        </SignInButton>
        <SignUpButton>
          <button className="px-4 py-2 border border-border rounded-md hover:bg-muted">
            Sign Up
          </button>
        </SignUpButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}