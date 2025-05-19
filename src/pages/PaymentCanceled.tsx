
import React from "react";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { Link } from "react-router-dom";

const PaymentCanceled = () => {
  return (
    <div className="container px-4 py-16 text-center"> {/* Adjusted for Pam sidebar */}
      <div className="mb-6 flex justify-center">
        <div className="rounded-full bg-red-100 p-3">
          <XCircle className="h-12 w-12 text-red-500" />
        </div>
      </div>
      <h1 className="text-3xl font-bold mb-4">Payment Canceled</h1>
      <p className="text-muted-foreground mb-8">
        Your payment process was canceled. If you have any questions or need assistance, please don't hesitate to contact us.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link to="/">Back to Home</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/profile">Go to Profile</Link>
        </Button>
      </div>
    </div>
  );
};

export default PaymentCanceled;
