
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature!,
        Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response("Invalid signature", { status: 400 });
    }

    console.log("Processing webhook event:", event.type);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        // Get customer details
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        
        // Determine plan type and video access
        const priceId = subscription.items.data[0].price.id;
        let planType = 'monthly';
        let videoAccess = false;
        
        if (priceId === 'price_1RJDV7DXysaVZSVhFRfsFqzv') {
          planType = 'annual';
          videoAccess = true;
        }

        // Update user subscription
        const { error } = await supabase
          .from('user_subscriptions')
          .upsert({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status === 'active' ? 'active' : subscription.status,
            plan_type: planType,
            video_course_access: videoAccess,
            trial_ends_at: null, // Clear trial when subscription becomes active
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'stripe_customer_id'
          });

        if (error) {
          console.error("Error updating subscription:", error);
          return new Response("Database error", { status: 500 });
        }

        console.log(`Subscription ${subscription.id} processed successfully`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Update subscription status to cancelled
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            subscription_status: 'cancelled',
            video_course_access: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error("Error cancelling subscription:", error);
          return new Response("Database error", { status: 500 });
        }

        console.log(`Subscription ${subscription.id} cancelled successfully`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;
        
        // Update subscription status to expired
        const { error } = await supabase
          .from('user_subscriptions')
          .update({
            subscription_status: 'expired',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error("Error updating failed payment:", error);
          return new Response("Database error", { status: 500 });
        }

        console.log(`Payment failed for subscription ${subscriptionId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal server error", { status: 500 });
  }
});
