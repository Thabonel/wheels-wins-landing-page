
import BudgetCategoryCard from "./BudgetCategoryCard";
import { BudgetCategory } from "./types";

interface BudgetCategoriesGridProps {
  categories: BudgetCategory[];
}

export default function BudgetCategoriesGrid({ categories }: BudgetCategoriesGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categories.map((category) => (
        <BudgetCategoryCard 
          key={category.id}
          {...category}
        />
      ))}
    </div>
  );
}
