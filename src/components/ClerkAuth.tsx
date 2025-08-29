import React from 'react';
import { Button } from "@/components/ui/button";

export default function ClerkAuth() {
  return (
    <div className="flex items-center gap-4">
      <Button variant="default">
        Sign In
      </Button>
      <Button variant="outline">
        Sign Up
      </Button>
    </div>
  );
}