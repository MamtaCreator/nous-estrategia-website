export type AlertType = 'KPIThreshold' | 'ProcessBottleneck' | 'MarketingPerformance' | 'FinancialAnomaly' | 'AutomationFailure' | 'Custom';
export type AlertSeverity = 'Info' | 'Warning' | 'Critical';
export type AlertCondition = 'GreaterThan' | 'GreaterThanOrEqual' | 'LessThan' | 'LessThanOrEqual' | 'Equals' | 'Outside';
export const ALERT_SEVERITIES: AlertSeverity[] = ['Info', 'Warning', 'Critical'];
export const ALERT_CONDITIONS: AlertCondition[] = ['GreaterThan', 'GreaterThanOrEqual', 'LessThan', 'LessThanOrEqual', 'Equals', 'Outside'];

export interface Alert {
  id: string; clientId: string; kpiId: string; kpiName: string; alertName: string;
  alertType: AlertType; severity: AlertSeverity; condition: AlertCondition;
  threshold: number; upperThreshold: number | null; recipientEmails: string[];
  isActive: boolean; isBreaching: boolean; lastTriggeredAt: string | null; createdAt: string;
}
export interface CreateAlertRequest {
  clientId: string; kpiId: string; alertName: string; alertType: AlertType; severity: AlertSeverity;
  condition: AlertCondition; threshold: number; upperThreshold: number | null; recipientEmails: string[];
}
export interface UpdateAlertRequest {
  alertName: string; severity: AlertSeverity; condition: AlertCondition; threshold: number;
  upperThreshold: number | null; recipientEmails: string[]; isActive: boolean;
}

export type NotificationType = 'Alert' | 'ReportGenerated' | 'ReportFailed' | 'KPIUpdate' | 'SystemNotification';
export interface AppNotification {
  id: string; clientId: string; title: string; message: string; type: NotificationType;
  relatedEntityType: string | null; relatedEntityId: string | null; isRead: boolean; createdAt: string; readAt: string | null;
}
export interface NotificationSummary { unreadCount: number; recent: AppNotification[]; }

export type InsightType = 'Trend' | 'Anomaly' | 'Opportunity' | 'Risk';
export interface Insight {
  id: string; clientId: string; kpiId: string | null; kpiName: string | null; type: InsightType; category: string;
  title: string; description: string; recommendation: string; impactScore: number; isActioned: boolean;
  generatedAt: string; expiresAt: string;
}
export interface GenerateInsightsResult { generated: number; insights: Insight[]; }

export interface AuditLog {
  id: string; clientId: string | null; userId: string | null; userName: string | null; entityType: string;
  entityId: string; action: 'Create' | 'Update' | 'Delete'; changes: string | null; createdAt: string;
}

export interface SearchResult { entityType: string; id: string; clientId: string; title: string; snippet: string | null; }
export interface SearchResponse { query: string; totalResults: number; results: SearchResult[]; }

export type ReportType = 'FinancialSummary' | 'MarketingPerformance' | 'ProcessEfficiency' | 'AutomationImpact' | 'ExecutiveOverview' | 'Custom';
export type ReportFormat = 'PDF' | 'Excel' | 'CSV';
export const REPORT_TYPES: ReportType[] = ['FinancialSummary', 'MarketingPerformance', 'ProcessEfficiency', 'AutomationImpact', 'ExecutiveOverview', 'Custom'];
export const REPORT_FORMATS: ReportFormat[] = ['PDF', 'Excel', 'CSV'];
export interface SavedReport {
  id: string; clientId: string; name: string; description: string; type: ReportType; format: ReportFormat;
  kpiIds: string[]; periodDays: number; isScheduled: boolean; cronExpression: string | null; recipientEmails: string[];
  lastGeneratedAt: string | null; nextScheduledAt: string | null; isActive: boolean; createdAt: string;
}
export interface CreateReportRequest {
  clientId: string; name: string; description: string; type: ReportType; format: ReportFormat; kpiIds: string[];
  periodDays: number; isScheduled: boolean; cronExpression: string | null; recipientEmails: string[];
}
export interface ReportExecution {
  id: string; reportId: string; executedAt: string; completedAt: string | null; status: 'Success' | 'Failed';
  kpiCount: number; fileSizeBytes: number; errorMessage: string | null; wasScheduled: boolean;
}
