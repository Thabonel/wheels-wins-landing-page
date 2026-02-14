import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { GearItem } from "@/data/gearCatalog";
import GearItemCard from "./GearItemCard";

interface GearListProps {
  items: GearItem[];
  categories: readonly string[];
}

export default function GearList({ items, categories }: GearListProps) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const visibleCategories = activeCategory
    ? [activeCategory]
    : [...categories];

  return (
    <div className="space-y-8">
      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={activeCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveCategory(null)}
        >
          All
        </Button>
        {categories.map((cat) => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Items grouped by category */}
      {visibleCategories.map((cat) => {
        const catItems = items.filter((i) => i.category === cat);
        if (catItems.length === 0) return null;

        return (
          <section key={cat}>
            <h2 className="text-xl font-semibold mb-4">{cat}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catItems.map((item) => (
                <GearItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
