import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShoppingCart, Star, Flag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/common/AnimatedDialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ShopProduct, isDigitalProduct, isAffiliateProduct } from "./types";
import { useRegion } from "@/context/RegionContext";
import { useAuth } from "@/context/AuthContext";

interface ProductCardProps {
  product: ShopProduct;
  onExternalLinkClick: (url: string, productId?: string) => void;
  onBuyProduct: (productId: string) => void;
}

export default function ProductCard({ product, onExternalLinkClick, onBuyProduct }: ProductCardProps) {
  const { regionConfig } = useRegion();
  const { user } = useAuth();

  // Report issue state
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [issueType, setIssueType] = useState<string>("");
  const [issueNotes, setIssueNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClick = () => {
    if (isAffiliateProduct(product)) {
      onExternalLinkClick(product.externalLink, product.id);
    } else if (isDigitalProduct(product)) {
      onBuyProduct(product.id);
    }
  };

  const handleReportIssue = async () => {
    if (!issueType) {
      toast.error("Please select an issue type");
      return;
    }

    setSubmitting(true);

    try {
      // Insert report into product_issue_reports table
      const { error } = await supabase.from('product_issue_reports').insert({
        product_id: product.id,
        user_id: user?.id || null,
        issue_type: issueType,
        notes: issueNotes.trim() || null,
        product_snapshot: {
          title: product.title,
          price: isDigitalProduct(product) ? product.price : (isAffiliateProduct(product) ? product.price : null),
          currency: isDigitalProduct(product) ? product.currency : (isAffiliateProduct(product) ? product.currency : null),
        },
      });

      if (error) {
        console.error('Failed to submit product report:', error);
        toast.error("Failed to submit report. Please try again.");
        return;
      }

      toast.success("Thank you for reporting this issue!");
      setReportDialogOpen(false);
      setIssueType("");
      setIssueNotes("");
    } catch (error) {
      console.error('Unexpected error submitting report:', error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="pb-2">
        <div className="aspect-video bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
          {product.image ? (
            <img 
              src={product.image} 
              alt={`${product.title} - RV travel product recommended for trip planning and budgeting`}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <div className="text-gray-400 text-sm">No image</div>
          )}
        </div>
        
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-sm font-semibold line-clamp-2 flex-1">
            {product.title}
          </CardTitle>
          
          {isAffiliateProduct(product) && product.isPamRecommended && (
            <Badge variant="secondary" className="text-xs shrink-0">
              <Star className="w-3 h-3 mr-1" />
              Pam's Pick
            </Badge>
          )}
          
          {isDigitalProduct(product) && product.isNew && (
            <Badge className="text-xs shrink-0">New</Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 pb-2">
        <p className="text-sm text-gray-600 line-clamp-3">
          {product.description}
        </p>
        
        {isDigitalProduct(product) && (
          <div className="mt-2">
            <span className="text-lg font-bold text-green-600">
              {regionConfig.currencySymbol}{product.price.toFixed(2)}
            </span>
            <span className="text-sm text-gray-500 ml-1">
              {product.currency}
            </span>
          </div>
        )}

        {isAffiliateProduct(product) && (
          <div className="mt-2">
            {product.price !== undefined && product.price !== null ? (
              <>
                <span className="text-lg font-bold text-blue-600">
                  {product.currency === regionConfig.currency
                    ? regionConfig.currencySymbol
                    : `${product.currency} `}{product.price.toFixed(2)}
                </span>
                <span className="text-xs text-gray-400 ml-1">
                  on Amazon
                </span>
              </>
            ) : (
              <span className="text-sm text-blue-600 font-medium">
                Check Amazon for current price
              </span>
            )}
          </div>
        )}
        
        {/* Digistore24 specific badges */}
        {product.commission_percentage && product.commission_percentage > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {product.commission_percentage}% commission
            </Badge>
            {product.auto_approved && (
              <Badge variant="outline" className="text-xs text-green-600">
                Auto-approved
              </Badge>
            )}
          </div>
        )}
        
        {product.vendor_rating && product.vendor_rating > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-600">
              {product.vendor_rating.toFixed(1)} vendor rating
            </span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-2 flex-col gap-2">
        <Button
          onClick={handleClick}
          className="w-full"
          variant={isAffiliateProduct(product) ? "outline" : "default"}
        >
          {isAffiliateProduct(product) ? (
            <>
              <ExternalLink className="w-4 h-4 mr-2" />
              View Deal
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Buy Now
            </>
          )}
        </Button>

        {/* Report Issue Dialog */}
        <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-xs text-gray-500 hover:text-gray-700">
              <Flag className="w-3 h-3 mr-1" />
              Report Issue
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Report Product Issue</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="text-sm text-gray-600">
                Report an issue with <strong>{product.title}</strong>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue-type">Issue Type *</Label>
                <Select value={issueType} onValueChange={setIssueType}>
                  <SelectTrigger id="issue-type">
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incorrect_price">Incorrect Price</SelectItem>
                    <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                    <SelectItem value="discontinued">Product Discontinued</SelectItem>
                    <SelectItem value="broken_link">Broken Link</SelectItem>
                    <SelectItem value="wrong_image">Wrong Image</SelectItem>
                    <SelectItem value="wrong_description">Wrong Description</SelectItem>
                    <SelectItem value="other">Other Issue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue-notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="issue-notes"
                  placeholder="Provide more details about the issue..."
                  value={issueNotes}
                  onChange={(e) => setIssueNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReportDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleReportIssue}
                  disabled={!issueType || submitting}
                >
                  {submitting ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardFooter>
    </Card>
  );
}
