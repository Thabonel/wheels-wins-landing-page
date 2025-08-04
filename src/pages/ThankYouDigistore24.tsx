import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, AlertCircle, ShoppingBag, ArrowRight } from "lucide-react";
import { digistore24Service } from "@/services/digistore24Service";
import { useAuth } from "@/contexts/AuthContext";

export default function ThankYouDigistore24() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [validationStatus, setValidationStatus] = useState<"validating" | "valid" | "invalid">("validating");
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    const validateAndTrackPurchase = async () => {
      // Extract parameters from URL
      const params = {
        order_id: searchParams.get("order_id") || "",
        product_id: searchParams.get("product_id") || "",
        email: searchParams.get("email") || "",
        first_name: searchParams.get("first_name") || "",
        last_name: searchParams.get("last_name") || "",
        amount: searchParams.get("amount") || "",
        currency: searchParams.get("currency") || "",
        hash: searchParams.get("hash") || "",
      };

      // Store order details
      setOrderDetails(params);

      // Validate parameters
      const isValid = digistore24Service.validateThankYouParams(params);
      
      if (isValid) {
        setValidationStatus("valid");
        
        // Track the purchase
        await digistore24Service.trackPurchase(params);
      } else {
        setValidationStatus("invalid");
      }
    };

    validateAndTrackPurchase();
  }, [searchParams]);

  if (validationStatus === "validating") {
    return (
      <div className="container px-4 py-16 text-center">
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <span className="ml-3 text-gray-600">Validating your purchase...</span>
        </div>
      </div>
    );
  }

  if (validationStatus === "invalid") {
    return (
      <div className="container px-4 py-16">
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <div className="mb-4 flex justify-center">
              <div className="rounded-full bg-red-100 p-3">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
            </div>
            <CardTitle>Invalid Order</CardTitle>
            <CardDescription>
              We couldn't validate your order details. This might happen if you accessed this page directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/shop")} className="mt-4">
              Return to Shop
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container px-4 py-16">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 p-3">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Thank You for Your Purchase!</CardTitle>
          <CardDescription className="text-lg mt-2">
            Your order has been successfully processed.
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {/* Order Summary */}
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Order Summary
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order ID:</span>
                <span className="font-medium">{orderDetails.order_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Product ID:</span>
                <span className="font-medium">{orderDetails.product_id}</span>
              </div>
              {orderDetails.amount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-medium">
                    {orderDetails.currency} {orderDetails.amount}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Next Steps */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3">What's Next?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                You'll receive an email confirmation from Digistore24 with your purchase details
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                Access instructions for digital products will be sent to your email
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                Your purchase has been recorded in your Wheels & Wins account
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Button onClick={() => navigate("/you")} className="flex-1">
              Go to Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate("/shop")} 
              className="flex-1 flex items-center justify-center gap-2"
            >
              Continue Shopping
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Support Info */}
          <div className="mt-6 pt-6 border-t text-center text-sm text-gray-600">
            <p>
              Need help? Contact support at{" "}
              <a href="mailto:support@wheelsandwins.com" className="text-purple-600 hover:underline">
                support@wheelsandwins.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}