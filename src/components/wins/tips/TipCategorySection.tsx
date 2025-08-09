
import { TipCategory } from "./types";
import TipCard from "./TipCard";

interface TipCategorySectionProps {
  category: TipCategory;
}

export default function TipCategorySection({ category }: TipCategorySectionProps) {
  return (
    <div key={category.id}>
      <h3 className="font-medium text-lg mb-3">{category.name}</h3>
      <div className="space-y-3">
        {category.tips.map((tip) => (
          <TipCard key={tip.id} tip={tip} />
        ))}
      </div>
    </div>
  );
}
