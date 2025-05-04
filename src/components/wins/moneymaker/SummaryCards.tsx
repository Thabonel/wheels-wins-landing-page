
import { IncomeIdea } from "./types";
import SummaryCard from "./SummaryCard";

interface SummaryCardsProps {
  totalMonthlyIncome: number;
  activeIdeas: IncomeIdea[];
}

export default function SummaryCards({ totalMonthlyIncome, activeIdeas }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SummaryCard
        title="Total Monthly Income"
        value={`$${totalMonthlyIncome}`}
        trend={{
          value: "+$230 from last month",
          isPositive: true
        }}
      />
      
      <SummaryCard
        title="Active Income Streams"
        value={activeIdeas.filter(i => i.status === "Active").length}
        subtitle={`${activeIdeas.filter(i => i.status === "Paused").length} currently paused`}
      />
      
      <SummaryCard
        title="Top Performer"
        value={activeIdeas.sort((a, b) => b.monthlyIncome - a.monthlyIncome)[0]?.name}
        subtitle={`$${activeIdeas.sort((a, b) => b.monthlyIncome - a.monthlyIncome)[0]?.monthlyIncome}/month`}
      />
    </div>
  );
}
