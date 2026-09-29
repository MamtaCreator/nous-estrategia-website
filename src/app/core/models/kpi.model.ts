export type KpiCategory = 'Financial' | 'Marketing' | 'Operations' | 'Automation' | 'Customer' | 'Performance';
export type KpiDataType = 'Numeric' | 'Percentage' | 'Currency' | 'Boolean' | 'Categorical';
export type KpiStatus = 'Green' | 'Amber' | 'Red';
export type TrendAssessment = 'InsufficientData' | 'Improving' | 'Declining' | 'Stable';

export const KPI_CATEGORIES: KpiCategory[] = ['Financial', 'Marketing', 'Operations', 'Automation', 'Customer', 'Performance'];
export const KPI_DATA_TYPES: KpiDataType[] = ['Numeric', 'Percentage', 'Currency', 'Boolean', 'Categorical'];

export interface Kpi {
  id: string;
  clientId: string;
  name: string;
  description: string;
  category: KpiCategory;
  dataType: KpiDataType;
  targetValue: number | null;
  minThreshold: number | null;
  maxThreshold: number | null;
  unit: string;
  status: KpiStatus | null;
  isActive: boolean;
  metricKey: string | null;
  isCalculated: boolean;
  higherIsBetter: boolean;
  currentValue: number | null;
  lastMeasuredAt: string | null;
  percentageToTarget: number | null;
  trendDirection: number;
  percentageChange: number | null;
  updatedAt: string;
}

// A metricKey makes the KPI calculated (category/type/unit/direction then come from the catalog);
// omit it for a manual KPI.
export interface CreateKpiRequest {
  clientId: string;
  name: string;
  description: string;
  category: KpiCategory;
  dataType: KpiDataType;
  targetValue: number | null;
  minThreshold: number | null;
  maxThreshold: number | null;
  unit: string;
  metricKey?: string | null;
  higherIsBetter: boolean;
}

export interface RecordKpiValueRequest {
  value: number;
  measuredAt?: string | null;
  notes?: string | null;
}

export interface TrendAnalysis {
  points: number;
  first: number | null;
  last: number | null;
  change: number | null;
  changePercent: number | null;
  slopePerDay: number | null;
  average: number | null;
  min: number | null;
  max: number | null;
  stdDeviation: number | null;
  assessment: TrendAssessment;
}

export interface KpiHistory {
  kpiId: string;
  kpiName: string;
  category: KpiCategory;
  currentValue: number | null;
  targetValue: number | null;
  status: KpiStatus | null;
  measurementDates: string[];
  values: number[];
  averageValue: number | null;
  maxValue: number | null;
  minValue: number | null;
  trend: TrendAnalysis;
}

export interface MetricDefinition {
  key: string;
  name: string;
  description: string;
  category: KpiCategory;
  dataType: KpiDataType;
  unit: string;
  higherIsBetter: boolean;
}

export interface KpiSummary {
  total: number;
  green: number;
  amber: number;
  red: number;
  notEvaluated: number;
  byCategory: Record<string, number>;
  needsAttention: Kpi[];
}

export interface RecalculateResult {
  recalculated: number;
  skippedNoData: string[];
  calculatedAt: string;
}

export interface CreateDefaultsResult {
  created: number;
  alreadyPresent: number;
  kpis: Kpi[];
}
