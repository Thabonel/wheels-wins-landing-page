
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ShoppingCart, Star } from "lucide-react";
import { ShopProduct, isDigitalProduct, isAffiliateProduct } from "./types";
import { useRegion } from "@/context/RegionContext";

interface ProductCardProps {
  product: ShopProduct;
  onExternalLinkClick: (url: string, productId?: string) => void;
  onBuyProduct: (productId: string) => void;
}

export default function ProductCard({ product, onExternalLinkClick, onBuyProduct }: ProductCardProps) {
  const { regionConfig } = useRegion();
  
  const handleClick = () => {
    if (isAffiliateProduct(product)) {
      onExternalLinkClick(product.externalLink, product.id);
    } else if (isDigitalProduct(product)) {
      onBuyProduct(product.id);
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
      
      <CardFooter className="pt-2">
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
      </CardFooter>
    </Card>
  );
}
