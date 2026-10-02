import { DestroyRef, Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthResult, LoginRequest, RegisterRequest } from '../models/auth.model';
import { User, UserRole, WRITER_ROLES, ADMIN_ROLES } from '../models/user.model';
import { HttpService } from './http.service';

const TOKEN_KEY = 'nous_access_token';
const USER_KEY = 'nous_current_user';

// Decodes a JWT's payload without verifying the signature — used client-side only to read
// the expiry so the UI can pre-emptively log out; the server is always the source of truth.
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (typeof payload?.exp !== 'number' || !Number.isFinite(payload.exp)) return true;
  return payload.exp * 1000 <= Date.now();
}

// There is no refresh-token or logout endpoint on the backend (JWTs are stateless and simply
// expire — see the backend README's "Known limitations"), so this service does not attempt
// silent refresh: an expired/401'd session just signs the user out.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly http = inject(HttpService);
  private expiryTimer?: ReturnType<typeof setTimeout>;

  private readonly currentUserSignal = signal<User | null>(this.loadStoredUser());
  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);
  readonly userRole = computed<UserRole | null>(() => this.currentUserSignal()?.role ?? null);

  /** The caller's tenant, shown in the shell so it is always obvious whose data is on screen. */
  readonly organizationName = computed(() => this.currentUserSignal()?.organizationName ?? '');

  // Defined once here rather than repeated at each call site: a new role must not silently miss a screen.
  // These only decide what the UI offers - the API enforces the same rules regardless of what is rendered.
  readonly canWrite = computed(() => {
    const role = this.userRole();
    return role !== null && WRITER_ROLES.includes(role);
  });
  readonly isAdmin = computed(() => {
    const role = this.userRole();
    return role !== null && ADMIN_ROLES.includes(role);
  });

  constructor() {
    if (!this.isBrowser) return;
    this.scheduleExpiry();
    const syncSession = (event: StorageEvent) => {
      if (event.key === TOKEN_KEY || event.key === USER_KEY || event.key === null) {
        this.currentUserSignal.set(this.loadStoredUser());
        this.scheduleExpiry();
      }
    };
    window.addEventListener('storage', syncSession);
    inject(DestroyRef).onDestroy(() => {
      clearTimeout(this.expiryTimer);
      window.removeEventListener('storage', syncSession);
    });
  }

  private scheduleExpiry(): void {
    clearTimeout(this.expiryTimer);
    const token = localStorage.getItem(TOKEN_KEY);
    const expiry = token ? decodeJwtPayload(token)?.exp : null;
    if (typeof expiry !== 'number' || !Number.isFinite(expiry)) return;
    this.expiryTimer = setTimeout(
      () => {
        if (isExpired(token!)) this.logout();
        else this.scheduleExpiry();
      },
      Math.min(Math.max(0, expiry * 1000 - Date.now()), 2_147_483_647),
    );
  }

  private loadStoredUser(): User | null {
    if (!this.isBrowser) return null;
    const token = localStorage.getItem(TOKEN_KEY);
    const rawUser = localStorage.getItem(USER_KEY);
    if (!token || !rawUser || isExpired(token)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }
    try {
      const user = JSON.parse(rawUser) as User;
      if (
        user &&
        typeof user.id === 'string' &&
        typeof user.name === 'string' &&
        typeof user.email === 'string' &&
        (['Admin', 'Consultant', 'Analyst', 'Viewer', 'SuperAdmin'] as string[]).includes(user.role) &&
        Array.isArray(user.assignedClientIds)
      )
        return user;
    } catch {
      // Invalid stored profiles must never grant access to protected screens.
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }

  login(request: LoginRequest): Observable<AuthResult> {
    return this.http.post<AuthResult>('/auth/login', request).pipe(
      map((response) => this.unwrap(response, 'Login failed')),
      tap((result) => this.storeSession(result)),
    );
  }

  register(request: RegisterRequest): Observable<AuthResult> {
    return this.http.post<AuthResult>('/auth/register', request).pipe(
      map((response) => this.unwrap(response, 'Registration failed')),
      tap((result) => this.storeSession(result)),
    );
  }

  /** Re-fetches the current user from the server (e.g. after a role change). */
  refreshProfile(): Observable<User> {
    return this.http.get<User>('/auth/me').pipe(
      map((response) => this.unwrap(response, 'Could not load your profile')),
      tap((user) => {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.currentUserSignal.set(user);
      }),
    );
  }

  logout(): void {
    clearTimeout(this.expiryTimer);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
  }

  getAccessToken(): string | null {
    if (!this.isBrowser) return null;
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && isExpired(token)) {
      this.logout();
      return null;
    }
    return token;
  }

  private storeSession(result: AuthResult): void {
    if (!result?.token || isExpired(result.token) || !result.user?.id) {
      throw new Error('The server returned an invalid session. Please sign in again.');
    }
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    this.currentUserSignal.set(result.user);
    this.scheduleExpiry();
  }

  private unwrap<T>(
    response: { success: boolean; data: T | null; error: { message: string } | null },
    fallback: string,
  ): T {
    if (!response.success || response.data === null) {
      throw new Error(response.error?.message ?? fallback);
    }
    return response.data;
  }
}
