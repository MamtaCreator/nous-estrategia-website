import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  provideRouter,
} from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './services/auth.service';
import { HttpService } from './services/http.service';
import { LoadingService } from './services/loading.service';
import { NotificationService } from './services/notification.service';
import { authInterceptor } from './interceptors/auth.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';
import { loadingInterceptor } from './interceptors/loading.interceptor';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';
import { ClientService } from '../modules/clients/services/client.service';
import { ProjectService } from '../modules/projects/services/project.service';
import { environment } from '../../environments/environment';

const user = {
  id: 'user-1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'Admin',
  assignedClientIds: [],
};
const envelope = <T>(data: T) => ({ success: true, data, error: null, pagination: null });
function token(expires = Date.now() + 60_000): string {
  return `header.${btoa(JSON.stringify({ sub: user.id, exp: Math.floor(expires / 1000) }))}.signature`;
}
function storedSession(value = token()): void {
  localStorage.setItem('nous_access_token', value);
  localStorage.setItem('nous_current_user', JSON.stringify(user));
}

describe('Phase 1 integration', () => {
  let backend: HttpTestingController;
  let notices: { error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
      clear: () => storage.clear(),
    });
    localStorage.clear();
    notices = { error: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(
          withInterceptors([authInterceptor, errorInterceptor, loadingInterceptor]),
        ),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notices },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    backend.verify();
    TestBed.resetTestingModule();
    localStorage.clear();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('logs in using the real backend envelope and stores the session', () => {
    const auth = TestBed.inject(AuthService);
    auth.login({ email: user.email, password: 'Password1!' }).subscribe();
    const req = backend.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush(envelope({ token: token(), user }));
    expect(auth.currentUser()?.name).toBe(user.name);
    expect(auth.isAuthenticated()).toBe(true);
  });

  it('restores the full stored profile on reload', () => {
    storedSession();
    expect(TestBed.inject(AuthService).currentUser()?.email).toBe(user.email);
  });

  it('rejects expired sessions', () => {
    storedSession(token(Date.now() - 1000));
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
    expect(localStorage.getItem('nous_access_token')).toBeNull();
  });

  it('rejects malformed stored profiles', () => {
    storedSession();
    localStorage.setItem('nous_current_user', '{}');
    expect(TestBed.inject(AuthService).isAuthenticated()).toBe(false);
  });

  it('clears idle sessions at token expiry', () => {
    vi.useFakeTimers();
    storedSession(token(Date.now() + 2000));
    const auth = TestBed.inject(AuthService);
    vi.advanceTimersByTime(2100);
    expect(auth.isAuthenticated()).toBe(false);
  });

  it('synchronizes logout from another tab', () => {
    storedSession();
    const auth = TestBed.inject(AuthService);
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
    expect(auth.currentUser()).toBeNull();
  });

  it('attaches credentials to API requests only', () => {
    storedSession();
    const http = TestBed.inject(HttpClient);
    http.get(`${environment.apiUrl}/clients`).subscribe();
    const api = backend.expectOne(`${environment.apiUrl}/clients`);
    expect(api.request.headers.get('Authorization')).toBe(
      `Bearer ${localStorage.getItem('nous_access_token')}`,
    );
    api.flush(envelope([]));
    for (const url of [
      'https://external.example/api/clients',
      `${environment.apiUrl}-other/clients`,
    ]) {
      http.get(url).subscribe();
      const external = backend.expectOne(url);
      expect(external.request.headers.has('Authorization')).toBe(false);
      external.flush({});
    }
  });

  it('handles protected 401s with a return URL and no retry loop', () => {
    storedSession();
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const auth = TestBed.inject(AuthService);
    TestBed.inject(HttpService)
      .get('/clients')
      .subscribe({ error: () => {} });
    backend
      .expectOne(`${environment.apiUrl}/clients`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(auth.isAuthenticated()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/' } });
    expect(notices.error).toHaveBeenCalledTimes(1);
  });

  it('keeps anonymous login failures on the login form', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate');
    TestBed.inject(AuthService)
      .login({ email: user.email, password: 'bad' })
      .subscribe({ error: () => {} });
    backend
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush(
        { error: { message: 'Invalid credentials' } },
        { status: 401, statusText: 'Unauthorized' },
      );
    expect(navigate).not.toHaveBeenCalled();
    expect(notices.error).toHaveBeenCalledWith('Invalid credentials');
  });

  it('keeps loading active until all overlapping requests finish or cancel', () => {
    const http = TestBed.inject(HttpService);
    const loading = TestBed.inject(LoadingService);
    http.get('/one').subscribe();
    const subscription = http.get('/two').subscribe();
    const first = backend.expectOne(`${environment.apiUrl}/one`);
    backend.expectOne(`${environment.apiUrl}/two`);
    first.flush(envelope([]));
    expect(loading.isLoading()).toBe(true);
    subscription.unsubscribe();
    expect(loading.isLoading()).toBe(false);
  });

  it('rejects unsuccessful 200 envelopes rather than reporting successful deletion', () => {
    const success = vi.fn();
    const error = vi.fn();
    TestBed.inject(ClientService).deleteClient('client-1').subscribe({ next: success, error });
    backend
      .expectOne(`${environment.apiUrl}/clients/client-1`)
      .flush({ success: false, data: null, error: { message: 'Denied' } });
    expect(success).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalled();
    expect(notices.error).toHaveBeenCalledWith('Denied');
  });

  it('maps server pagination without paginating a server page again', () => {
    const clients = TestBed.inject(ClientService);
    clients.loadClients({ page: 2, limit: 10 }).subscribe();
    backend.expectOne(`${environment.apiUrl}/clients?page=2&limit=10`).flush({
      ...envelope([{ id: 'client-2', companyName: 'Example' }]),
      pagination: { page: 2, limit: 10, total: 15, pages: 2 },
    });
    expect(clients.pagination()?.total).toBe(15);
    expect(clients.clients()[0].id).toBe('client-2');
  });

  it('maps project filters to the actual client project endpoint', () => {
    TestBed.inject(ProjectService)
      .loadByClient('client-1', { status: 'Planning', pillar: 'Finance' })
      .subscribe();
    backend
      .expectOne(`${environment.apiUrl}/projects/client/client-1?status=Planning&pillar=Finance`)
      .flush(envelope([]));
  });

  it('redirects unauthenticated navigation and preserves the destination', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/app/clients' } as RouterStateSnapshot),
    );
    expect(result.toString()).toBe('/login?returnUrl=%2Fapp%2Fclients');
  });

  it('denies writer routes to viewers', () => {
    storedSession();
    localStorage.setItem('nous_current_user', JSON.stringify({ ...user, role: 'Viewer' }));
    const result = TestBed.runInInjectionContext(() =>
      roleGuard(
        {
          data: { roles: ['Admin', 'Analyst', 'Consultant'] },
        } as unknown as ActivatedRouteSnapshot,
        {} as RouterStateSnapshot,
      ),
    );
    expect(result.toString()).toBe('/app/unauthorized');
  });
});
