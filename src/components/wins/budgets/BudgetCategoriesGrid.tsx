import { useBudgetCalculations } from "./useBudgetCalculations";
import BudgetCategoryCard from "./BudgetCategoryCard";

export default function BudgetCategoriesGrid() {
  const { categories, budgetSummary, loading } = useBudgetCalculations();

  if (loading) {
    return <div className="text-center py-6">Loading budget categories...</div>;
  }

  if (!categories || categories.length === 0) {
    return <div className="text-center py-6">No budget categories found.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {categories.map((category) => (
        <BudgetCategoryCard key={category.id} {...category} />
      ))}
    </div>
  );
}
