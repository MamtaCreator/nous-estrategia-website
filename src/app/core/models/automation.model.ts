export type AutomationType = 'Workflow' | 'Prediction' | 'Report' | 'DataProcessing';
export type AutomationTriggerType = 'Schedule' | 'Event' | 'Manual';
export type AutomationStatus = 'Draft' | 'Testing' | 'Active' | 'Disabled';

export const AUTOMATION_DEPLOYABLE_FROM: AutomationStatus[] = ['Testing', 'Disabled'];

export interface Automation {
  id: string;
  clientId: string;
  name: string;
  description: string;
  type: AutomationType;
  triggerType: AutomationTriggerType;
  triggerCondition: string;
  status: AutomationStatus;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  totalTimeAutomedMinutes: number;
  totalCostSavings: number;
  accuracyScore: number;
  deployedAt: string | null;
}

export interface CreateAutomationRequest {
  clientId: string;
  name: string;
  description: string;
  type: AutomationType;
  triggerType: AutomationTriggerType;
  triggerCondition: string;
  action: string;
  configuration: Record<string, string>;
}

export interface LogExecutionRequest {
  success: boolean;
  errorMessage: string | null;
  durationSeconds: number;
  timeAutomedMinutes: number;
  costSavings: number;
}

export interface Execution {
  id: string;
  executedAt: string;
  success: boolean;
  errorMessage: string | null;
  durationSeconds: number;
}
