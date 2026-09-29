// Matches NousEstrategia.Domain.Enums.UserRole.
export type UserRole = 'Admin' | 'Consultant' | 'Analyst' | 'Viewer' | 'SuperAdmin';

/** Roles that may create or change data. Viewers are read-only. */
export const WRITER_ROLES: readonly UserRole[] = ['SuperAdmin', 'Admin', 'Consultant', 'Analyst'];

/** Roles with administrative rights. A SuperAdmin is platform staff and outranks a tenant's own Admin. */
export const ADMIN_ROLES: readonly UserRole[] = ['SuperAdmin', 'Admin'];

// Matches NousEstrategia.Domain.DTOs.Auth.UserDto — the object every auth endpoint returns.
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** The tenant this account belongs to. Every record the user can reach lives in it. */
  organizationId: string;
  organizationName: string;
  assignedClientIds: string[];
}
