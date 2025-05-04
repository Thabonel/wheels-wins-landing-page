
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tag, Star, ArrowRight } from "lucide-react";
import { AffiliateProduct, DigitalProduct, isAffiliateProduct, isDigitalProduct, ShopProduct } from "./types";

interface ProductCardProps {
  product: ShopProduct;
  onExternalLinkClick: (url: string) => void;
  onBuyProduct: (productId: string) => void;
}

export default function ProductCard({ product, onExternalLinkClick, onBuyProduct }: ProductCardProps) {
  if (isDigitalProduct(product)) {
    return <DigitalProductCard 
      product={product} 
      onBuyProduct={onBuyProduct} 
    />;
  }
  
  return <AffiliateProductCard 
    product={product} 
    onExternalLinkClick={onExternalLinkClick} 
  />;
}

function DigitalProductCard({ product, onBuyProduct }: { product: DigitalProduct; onBuyProduct: (productId: string) => void }) {
  return (
    <Card className="overflow-hidden border-2 border-gray-100 hover:border-blue-200 transition-colors">
      <div className="relative h-40">
        <img 
          src={product.image} 
          alt={product.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 flex flex-col gap-2">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
            {product.type}
          </Badge>
          {product.isNew && (
            <Badge className="bg-green-600 hover:bg-green-700">
              New
            </Badge>
          )}
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-1">{product.title}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-bold text-blue-700">
              {product.currency === 'GBP' ? '£' : product.currency === 'AUD' ? 'A$' : '$'}{product.price} <span className="text-sm font-normal">{product.currency}</span>
            </div>
            {product.hasBonus && (
              <div className="flex items-center text-xs text-green-600 mt-1">
                <Tag className="w-3 h-3 mr-1" />
                Includes Bonus Materials
              </div>
            )}
          </div>
          <Button 
            onClick={() => onBuyProduct(product.id)} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Buy Now
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AffiliateProductCard({ product, onExternalLinkClick }: { product: AffiliateProduct; onExternalLinkClick: (url: string) => void }) {
  return (
    <Card className="overflow-hidden border-2 border-gray-100 hover:border-blue-200 transition-colors">
      <div className="relative h-40">
        <img 
          src={product.image} 
          alt={product.title}
          className="w-full h-full object-cover"
        />
        {product.isPamRecommended && (
          <Badge className="absolute top-2 left-2 bg-purple-600 hover:bg-purple-700">
            <Star className="w-3 h-3 mr-1" /> Pam Recommended
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <h3 className="text-lg font-semibold mb-1">{product.title}</h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{product.description}</p>
        <Button 
          onClick={() => onExternalLinkClick(product.externalLink)} 
          variant="outline"
          className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
        >
          View Deal <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
