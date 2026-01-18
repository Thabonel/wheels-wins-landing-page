
import { Card, CardContent } from "@/components/ui/card";
import { ShopProduct } from "./types";
import { Region } from "@/context/RegionContext";

interface FeaturedCarouselProps {
  products: ShopProduct[];
  region: Region;
}

export default function FeaturedCarousel({ products, region }: FeaturedCarouselProps) {
  const featuredProducts = products.slice(0, 3);

  return (
    <div className="mb-8 bg-blue-50 p-6 rounded-xl">
      <h2 className="text-xl font-semibold mb-4">
        Top Picks for {region}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {featuredProducts.map((product) => (
          <Card key={`featured-${product.id}`} className="border-2 border-blue-100 shadow-sm">
            <CardContent className="p-4">
              <div className="font-semibold text-blue-600">Featured</div>
              <div className="font-medium">{product.title}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
