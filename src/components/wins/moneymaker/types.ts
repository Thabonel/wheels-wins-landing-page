
export interface IncomeIdea {
  id: number;
  name: string;
  status: string;
  monthlyIncome: number;
  startDate: string;
  trend?: string;
  growth?: number;
  notes: string;
  topPerformer?: boolean;
  endDate?: string;
}

export interface ChartDataItem {
  name: string;
  income: number;
  fill: string;
}
