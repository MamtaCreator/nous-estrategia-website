export type ProjectPillar = 'Finance' | 'Marketing' | 'Processes' | 'AI';
export type ProjectStatus = 'Planning' | 'InProgress' | 'OnHold' | 'Completed' | 'Cancelled';
export type DeliverableStatus = 'Pending' | 'InProgress' | 'Done';

// Matches ProjectWorkflow.Transitions exactly — the backend rejects anything not listed here.
export const PROJECT_STATUS_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  Planning: ['InProgress', 'Cancelled'],
  InProgress: ['OnHold', 'Completed', 'Cancelled'],
  OnHold: ['InProgress', 'Cancelled'],
  Completed: [],
  Cancelled: [],
};

export function isProjectReadOnly(status: ProjectStatus): boolean {
  return status === 'Completed' || status === 'Cancelled';
}

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  dueDate: string;
  status: DeliverableStatus;
  assigneeId: string | null;
  isOverdue: boolean;
}

// Used for both POST .../deliverables (create) and PUT .../deliverables/{id} (full replace on update).
export interface DeliverableRequest {
  name: string;
  description: string;
  dueDate: string;
  status: DeliverableStatus;
  assigneeId: string | null;
}

export interface Project {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  pillar: ProjectPillar;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  budget: number | null;
  progress: number;
  teamMemberIds: string[];
  deliverables: Deliverable[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  clientId: string;
  name: string;
  description: string | null;
  pillar: ProjectPillar;
  startDate: string;
  endDate: string;
  budget: number | null;
  teamMemberIds: string[];
  deliverables: DeliverableRequest[];
}

// No clientId (immutable) and no status (separate PATCH endpoint). `progress` is only honored
// while the project has zero deliverables — otherwise the backend derives and overrides it.
export interface UpdateProjectRequest {
  name: string;
  description: string | null;
  pillar: ProjectPillar;
  startDate: string;
  endDate: string;
  budget: number | null;
  teamMemberIds: string[];
  progress: number;
}

export interface UpdateProjectStatusRequest {
  status: ProjectStatus;
}

export interface ProjectListFilters {
  status?: ProjectStatus;
  pillar?: ProjectPillar;
}
