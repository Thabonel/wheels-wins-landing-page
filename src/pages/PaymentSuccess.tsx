
import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

const PaymentSuccess = () => {
  const { fetchSubscription } = useSubscription();

  useEffect(() => {
    // Refresh subscription status after successful payment
    fetchSubscription();
  }, [fetchSubscription]);

  return (
    <div className="container px-4 py-16 text-center">
      <div className="mb-6 flex justify-center">
        <div className="rounded-full bg-green-100 p-3">
          <CheckCircle className="h-12 w-12 text-green-600" />
        </div>
      </div>
      <h1 className="text-3xl font-bold mb-4">Payment Successful!</h1>
      <p className="text-muted-foreground mb-8">
        Thank you for your subscription! Your membership has been activated, and you now have full access to all features.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Button asChild>
          <Link to="/you">Go to Dashboard</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/wheels">Explore Wheels</Link>
        </Button>
      </div>
    </div>
  );
};

export default PaymentSuccess;
