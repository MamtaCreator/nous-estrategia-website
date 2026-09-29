import { Campaign } from '../models/marketing.model';
import { Automation } from '../models/automation.model';
import { ProcessFlow } from '../models/process.model';
import { FinanceData } from '../models/finance.model';
import { PillarMetric } from '../../shared/pillar-kpis';
import { ratio } from './pillar-data';

export function financeMetrics(rows: FinanceData[]): PillarMetric[] {
  const revenue = rows.reduce((sum, row) => sum + row.totalRevenue, 0);
  const expenses = rows.reduce((sum, row) => sum + row.totalExpenses, 0);
  const profit = rows.reduce((sum, row) => sum + row.netIncome, 0);
  const margin = ratio(profit * 100, revenue);
  return [{label:'Revenue',value:revenue},{label:'Expenses',value:expenses},{label:'Net income',value:profit},{label:'Weighted profit margin',value:margin,unit:'%'}];
}
export function marketingMetrics(rows: Campaign[]): PillarMetric[] {
  const spent = rows.reduce((sum, row) => sum + row.spentBudget, 0);
  const clicks = rows.reduce((sum, row) => sum + row.totalClicks, 0);
  const impressions = rows.reduce((sum, row) => sum + row.totalImpressions, 0);
  // Weight ROI by spend, never average campaign percentages.
  const roi = ratio(rows.reduce((sum,row) => sum + row.roi * row.spentBudget, 0) * 100, spent);
  return [{label:'Budget',value:rows.reduce((sum,row) => sum + row.totalBudget,0)}, {label:'Spent',value:spent},
    {label:'Running campaigns',value:rows.filter(row => row.status === 'Running').length}, {label:'Weighted ROI',value:roi,unit:'%'},
    {label:'Click-through rate',value:ratio(clicks * 100,impressions),unit:'%'}];
}
export function automationMetrics(rows: Automation[]): PillarMetric[] {
  const total = rows.reduce((sum,row) => sum + row.totalExecutions,0);
  const successful = rows.reduce((sum,row) => sum + row.successfulExecutions,0);
  return [{label:'Active automations',value:rows.filter(row => row.status === 'Active').length},
    {label:'Executions',value:total},{label:'Success rate',value:ratio(successful * 100,total),unit:'%'},
    {label:'Time saved',value:rows.reduce((sum,row) => sum + row.totalTimeAutomedMinutes,0),unit:' min'},
    {label:'Cost savings',value:rows.reduce((sum,row) => sum + row.totalCostSavings,0)}];
}
export function processMetrics(rows: ProcessFlow[]): PillarMetric[] {
  return [{label:'Processes',value:rows.length},{label:'Bottlenecks',value:rows.reduce((sum,row) => sum + row.bottleneckCount,0)},
    {label:'Mean efficiency',value:ratio(rows.reduce((sum,row) => sum + row.efficiency,0),rows.length),unit:'%'},
    {label:'Potential savings per cycle',value:rows.reduce((sum,row) => sum + row.totalPotentialSavingsPerCycle,0)}];
}
