import { KpiCategory, KpiStatus, TrendAnalysis } from './kpi.model';

export type DashboardType = 'Executive' | 'Operational' | 'Finance' | 'Marketing' | 'Processes' | 'AIAutomation' | 'Custom';
export const DASHBOARD_TYPES: DashboardType[] = ['Executive', 'Operational', 'Finance', 'Marketing', 'Processes', 'AIAutomation', 'Custom'];

export interface DashboardWidget {
  id: string;
  widgetType: string;
  position: number;
  sizeX: number;
  sizeY: number;
  title: string;
  dataSource: string | null;
  widgetConfiguration: string | null;
  isVisible: boolean;
}

export interface DashboardKpi {
  id: string;
  kpiId: string;
  kpiName: string;
  displayOrder: number;
  showChart: boolean;
  showTrend: boolean;
  chartType: string;
  daysToDisplay: number;
}

export interface Dashboard {
  id: string;
  clientId: string;
  name: string;
  description: string;
  type: DashboardType;
  refreshIntervalSeconds: number;
  isActive: boolean;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  layoutConfiguration: string | null;
  widgets: DashboardWidget[];
  kpis: DashboardKpi[];
}

export interface DashboardKpiRequest {
  kpiId: string;
  displayOrder: number;
  showChart: boolean;
  showTrend: boolean;
  chartType: string;
  daysToDisplay: number;
}

export interface DashboardWidgetRequest {
  widgetType: string;
  position: number;
  sizeX: number;
  sizeY: number;
  title: string;
  dataSource: string | null;
  widgetConfiguration: string | null;
  isVisible: boolean;
}

export interface CreateDashboardRequest {
  clientId: string;
  name: string;
  description: string;
  type: DashboardType;
  refreshIntervalSeconds: number;
  isPublic: boolean;
  layoutConfiguration?: string | null;
  widgets: DashboardWidgetRequest[];
  kpis: DashboardKpiRequest[];
}

// PUT replaces settings, widgets and the KPI list — send the complete desired configuration.
export interface UpdateDashboardRequest extends Omit<CreateDashboardRequest, 'clientId'> {
  isActive: boolean;
}

export interface KpiView {
  id: string;
  name: string;
  category: KpiCategory;
  unit: string;
  metricKey: string | null;
  higherIsBetter: boolean;
  targetValue: number | null;
  value: number | null;
  isLive: boolean;
  status: KpiStatus | null;
  trend: TrendAnalysis;
  dates: string[];
  series: number[];
}

export interface WidgetData {
  widgetId: string;
  widgetType: string;
  title: string;
  dataSource: string | null;
  value: number | null;
  unit: string | null;
}

export interface DashboardData {
  dashboard: Dashboard;
  generatedAt: string;
  refreshIntervalSeconds: number;
  kpis: KpiView[];
  widgets: WidgetData[];
}
