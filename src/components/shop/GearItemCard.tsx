import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Search } from "lucide-react";
import type { GearItem } from "@/data/gearCatalog";

interface GearItemCardProps {
  item: GearItem;
}

export default function GearItemCard({ item }: GearItemCardProps) {
  const primaryUrl = item.primaryUrl || item.amazonAuSearchUrl;
  const primaryLabel = item.primaryCtaLabel || "Check on Amazon Australia";

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold leading-snug">
          {item.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 pb-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {item.why}
        </p>
      </CardContent>

      <CardFooter className="pt-0 flex-col gap-2">
        <Button asChild className="w-full" variant="default">
          <a
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            {primaryLabel}
          </a>
        </Button>

        {item.localSearchUrl && (
          <a
            href={item.localSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center text-xs text-muted-foreground hover:text-foreground transition-colors gap-1"
          >
            <Search className="w-3 h-3" />
            Search locally
          </a>
        )}
      </CardFooter>
    </Card>
  );
}
