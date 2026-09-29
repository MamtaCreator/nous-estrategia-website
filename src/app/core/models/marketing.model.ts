export type CampaignStatus = 'Draft' | 'Scheduled' | 'Running' | 'Paused' | 'Completed';

export const CAMPAIGN_LAUNCHABLE_FROM: CampaignStatus[] = ['Draft', 'Scheduled', 'Paused'];

export interface Campaign {
  id: string;
  clientId: string;
  name: string;
  type: string;
  objective: string;
  status: CampaignStatus;
  totalBudget: number;
  spentBudget: number;
  channels: string[];
  totalImpressions: number;
  totalClicks: number;
  totalConversions: number;
  ctr: number;
  conversionRate: number;
  cpc: number;
  cpa: number;
  roi: number;
  roas: number;
  startDate: string;
  endDate: string;
  launchedAt: string | null;
}

export interface CreateCampaignRequest {
  clientId: string;
  name: string;
  type: string;
  channels: string[];
  objective: string;
  totalBudget: number;
  startDate: string;
  endDate: string;
}

// Full-replace snapshot, not additive — each PATCH overwrites the previous metrics entirely.
export interface UpdateCampaignMetricsRequest {
  impressions: Record<string, number>;
  clicks: Record<string, number>;
  conversions: Record<string, number>;
  spentBudget: number;
  actualRevenue: number;
}
