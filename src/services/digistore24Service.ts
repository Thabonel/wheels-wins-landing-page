import { ENV } from "@/config/environment";
import { supabase } from "@/integrations/supabase/client";

export interface Digistore24CheckoutParams {
  productId: string;
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  custom?: string;
}

export interface Digistore24ThankYouParams {
  order_id: string;
  product_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  amount?: string;
  currency?: string;
  hash?: string;
}

class Digistore24Service {
  private vendorId: string;
  private thankYouPageKey: string;

  constructor() {
    this.vendorId = ENV.DIGISTORE24_VENDOR_ID || "Thabonel";
    this.thankYouPageKey = ENV.DIGISTORE24_THANK_YOU_PAGE_KEY || "";
  }

  /**
   * Generate affiliate URL for Digistore24 product
   */
  generateAffiliateUrl(productId: string, custom?: string): string {
    const baseUrl = `https://www.digistore24.com/redir/${productId}/${this.vendorId}/`;
    
    if (custom) {
      // Add custom tracking parameter
      return `${baseUrl}?custom=${encodeURIComponent(custom)}`;
    }
    
    return baseUrl;
  }

  /**
   * Generate checkout URL with user data pre-filled
   */
  generateCheckoutUrl(params: Digistore24CheckoutParams): string {
    const { productId, userId, email, firstName, lastName, custom } = params;
    
    // Base affiliate URL
    let url = this.generateAffiliateUrl(productId, custom || userId);
    
    // Add pre-fill parameters if available
    const queryParams = new URLSearchParams();
    
    if (email) queryParams.append("email", email);
    if (firstName) queryParams.append("first_name", firstName);
    if (lastName) queryParams.append("last_name", lastName);
    
    const queryString = queryParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
    
    return url;
  }

  /**
   * Validate thank you page parameters
   */
  validateThankYouParams(params: Digistore24ThankYouParams): boolean {
    if (!this.thankYouPageKey) {
      console.warn("Thank you page key not configured");
      return true; // Allow if not configured
    }
    
    // Digistore24 uses SHA256 hash of parameters with the thank you page key
    // This is a simplified validation - implement full hash validation if needed
    const { hash, ...dataParams } = params;
    
    if (!hash) {
      console.warn("No hash provided for validation");
      return false;
    }
    
    // TODO: Implement proper hash validation
    // For now, just check that required params are present
    return !!(params.order_id && params.product_id && params.email);
  }

  /**
   * Track successful purchase
   */
  async trackPurchase(params: Digistore24ThankYouParams): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // Track conversion event
      const trackingData = {
        event_type: "digistore24_purchase",
        user_id: user?.id,
        properties: {
          order_id: params.order_id,
          product_id: params.product_id,
          amount: params.amount,
          currency: params.currency,
          email: params.email,
        },
        created_at: new Date().toISOString(),
      };
      
      // Store in analytics table if available
      await supabase.from("analytics_events").insert(trackingData);
      
      // Update affiliate_sales table to mark thank you page as validated
      if (params.order_id) {
        await supabase
          .from("affiliate_sales")
          .update({ thank_you_validated: true })
          .eq("digistore24_order_id", params.order_id);
      }
      
      console.log("Purchase tracked successfully", trackingData);
    } catch (error) {
      console.error("Failed to track purchase:", error);
    }
  }

  /**
   * Get Digistore24 products from database
   */
  async getDigistore24Products() {
    try {
      const { data, error } = await supabase
        .from("shop_products")
        .select("*")
        .eq("type", "affiliate")
        .not("digistore24_product_id", "is", null)
        .eq("status", "active")
        .eq("sync_status", "active")
        .order("commission_percentage", { ascending: false });

      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error("Failed to fetch Digistore24 products:", error);
      return [];
    }
  }

  /**
   * Check if user can trigger sync (admin only)
   */
  async canUserSync(userId: string): Promise<boolean> {
    try {
      const { data } = await supabase
        .from("user_settings")
        .select("preferences")
        .eq("user_id", userId)
        .single();
      
      return data?.preferences?.role === "admin";
    } catch (error) {
      return false;
    }
  }

  /**
   * Trigger manual product sync (admin only)
   */
  async triggerProductSync(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/v1/digistore24/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return {
        success: true,
        message: result.message || "Product sync completed successfully",
      };
    } catch (error) {
      console.error("Failed to trigger sync:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Sync failed",
      };
    }
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    try {
      const response = await fetch(`${ENV.API_BASE_URL}/api/v1/digistore24/sync/status`, {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to get sync status");
      }
      
      return await response.json();
    } catch (error) {
      console.error("Failed to get sync status:", error);
      return null;
    }
  }
}

export const digistore24Service = new Digistore24Service();