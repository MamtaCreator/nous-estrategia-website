export type ProcessStatus = 'Draft' | 'Mapped' | 'Analyzed' | 'Optimized' | 'Implemented';

export interface ProcessStep {
  id: string;
  sequence: number;
  name: string;
  description: string;
  owner: string | null;
  durationMinutes: number;
  costPerExecution: number;
  isBottleneck: boolean;
}

export interface ProcessStepRequest {
  sequence: number;
  name: string;
  description: string;
  owner: string | null;
  durationMinutes: number;
  costPerExecution: number;
}

export interface ProcessFlow {
  id: string;
  clientId: string;
  name: string;
  description: string;
  category: string;
  status: ProcessStatus;
  steps: ProcessStep[];
  totalDurationMinutes: number;
  totalCostPerCycle: number;
  efficiency: number;
  bottleneckCount: number;
  bottleneckSteps: string[];
  optimizationRecommendations: string[];
  totalPotentialSavingsPerCycle: number;
}

export interface CreateProcessFlowRequest {
  clientId: string;
  name: string;
  description: string;
  category: string;
  steps: ProcessStepRequest[];
}

export interface AddRecommendationRequest {
  recommendation: string;
  potentialSavings: number;
}
