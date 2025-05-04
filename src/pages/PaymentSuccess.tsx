
import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const PaymentSuccess = () => {
  return (
    <div className="container max-w-lg mx-auto px-4 py-16 text-center">
      <div className="mb-6 flex justify-center">
        <div className="rounded-full bg-green-100 p-3">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
      </div>
      <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
      <p className="text-muted-foreground mb-8">
        Thank you for your purchase. Your subscription has been activated, and you now have full access to all features.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link to="/wheels">Explore Wheels</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/profile">View Profile</Link>
        </Button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
