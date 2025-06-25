
import { IncomeIdea, ChartDataItem } from "./types";

export const activeIdeas: IncomeIdea[] = [
  {
    id: 1,
    name: "Etsy Digital Downloads",
    status: "Active",
    monthlyIncome: 320,
    startDate: "Feb 10, 2025",
    trend: "up",
    growth: 27,
    notes: "Currently averaging $10-15/day with minimal maintenance needed",
    topPerformer: true
  },
  {
    id: 2,
    name: "Freelance Web Design",
    status: "Active",
    monthlyIncome: 950,
    startDate: "Mar 5, 2025",
    trend: "up",
    growth: 12,
    notes: "Taking 2-3 clients per month, about 30 hours of work total",
    topPerformer: true
  },
  {
    id: 3,
    name: "RV Blog",
    status: "Active",
    monthlyIncome: 150,
    startDate: "Jan 15, 2025",
    trend: "up",
    growth: 5,
    notes: "Growing slowly but steadily, mostly affiliate income",
    topPerformer: false
  },
  {
    id: 4,
    name: "YouTube Channel",
    status: "Paused",
    monthlyIncome: 85,
    startDate: "Dec 20, 2024",
    trend: "down",
    growth: -10,
    notes: "On pause while traveling through areas with poor internet",
    topPerformer: false
  }
];

export const archivedIdeas: IncomeIdea[] = [
  {
    id: 5,
    name: "Amazon FBA",
    status: "Archived",
    monthlyIncome: 0,
    startDate: "Oct 15, 2024",
    endDate: "Dec 5, 2024",
    notes: "Too difficult to manage inventory while traveling"
  },
  {
    id: 6,
    name: "Virtual Assistant",
    status: "Archived",
    monthlyIncome: 0,
    startDate: "Sep 3, 2024",
    endDate: "Nov 10, 2024",
    notes: "Found better-paying opportunities that are more flexible"
  }
];

// Chart data
export const chartData: ChartDataItem[] = activeIdeas.map(idea => ({
  name: idea.name,
  income: idea.monthlyIncome,
  fill: idea.topPerformer ? '#8B5CF6' : '#0EA5E9'
}));
