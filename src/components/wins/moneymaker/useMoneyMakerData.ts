
import { activeIdeas, archivedIdeas, chartData } from "./mockData";

export function useMoneyMakerData() {
  // Calculate total monthly income
  const totalMonthlyIncome = activeIdeas.reduce((sum, idea) => sum + idea.monthlyIncome, 0);
  
  return {
    activeIdeas,
    archivedIdeas,
    chartData,
    totalMonthlyIncome
  };
}
