import { User, UserRole } from './user.model';

export interface LoginRequest {
  email: string;
  password: string;
}

// Role is only honored by the backend when the caller is already an authenticated Admin;
// anonymous sign-up always becomes Analyst regardless of what is sent here.
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  /** Names the organization a sign-up creates. Ignored when an Admin adds a user to their own organization. */
  organizationName?: string;
}

// The literal { token, user } object POST /api/auth/register and POST /api/auth/login return —
// there is no refresh token, no separate first/last name, and no clientId at this level.
export interface AuthResult {
  token: string;
  user: User;
}
