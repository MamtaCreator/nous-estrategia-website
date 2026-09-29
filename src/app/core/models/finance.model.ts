export interface FinanceData {
  id: string;
  clientId: string;
  period: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number | null;
  operatingMargin: number | null;
  roe: number | null;
  roa: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
  totalAssets: number;
  totalLiabilities: number;
  equity: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  revenueByProduct: Record<string, number>;
  expensesByCategory: Record<string, number>;
  revenueProjections: Record<string, number>;
  expenseProjections: Record<string, number>;
  profitProjections: Record<string, number>;
  updatedAt: string;
}

export interface FinanceDataRequest {
  clientId: string;
  period: string;
  totalRevenue: number;
  revenueByProduct: Record<string, number>;
  totalExpenses: number;
  expensesByCategory: Record<string, number>;
  fixedExpenses: number;
  variableExpenses: number;
  currentAssets: number;
  fixedAssets: number;
  currentLiabilities: number;
  longTermLiabilities: number;
  equity: number;
  operatingCashFlow: number | null;
  investingCashFlow: number;
  financingCashFlow: number;
}

export interface ProjectionRequest {
  clientId: string;
  currentPeriod: string;
  currentRevenue: number;
  currentExpenses: number;
  growthRate: number;
  expenseGrowthRate: number;
}

export interface ProjectionResult {
  revenue: Record<string, number>;
  expenses: Record<string, number>;
  profit: Record<string, number>;
}
