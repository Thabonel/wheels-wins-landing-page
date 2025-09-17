import { useBudgetCalculations } from "./useBudgetCalculations";
import BudgetCategoryCard from "./BudgetCategoryCard";
import { usePersonalization } from '@/hooks/usePersonalization';
import { cn } from '@/lib/utils';

export default function BudgetCategoriesGrid() {
  const { categories, budgetSummary, loading } = useBudgetCalculations();
  const {
    getGridColumns,
    getPersonalizedStyles,
    getAnimationClass,
    trackEvent,
    isPersonalized
  } = usePersonalization();

  if (loading) {
    const loadingClass = getAnimationClass();
    return (
      <div className="text-center py-6" style={getPersonalizedStyles('loading')}>
        <div className={cn("inline-block", loadingClass)}>
          Loading budget categories...
        </div>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-6" style={getPersonalizedStyles('empty')}>
        No budget categories found.
      </div>
    );
  }

  const handleCategoryClick = (categoryId: string) => {
    trackEvent('budget_category_viewed', {
      category_id: categoryId,
      personalized_layout: isPersonalized
    });
  };

  return (
    <div
      className={cn("grid gap-4", getGridColumns())}
      style={getPersonalizedStyles('grid')}
    >
      {categories.map((category) => (
        <div
          key={category.id}
          onClick={() => handleCategoryClick(category.id)}
          className="cursor-pointer"
        >
          <BudgetCategoryCard {...category} />
        </div>
      ))}
    </div>
  );
}
