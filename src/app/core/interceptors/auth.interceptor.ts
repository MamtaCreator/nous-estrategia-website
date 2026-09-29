import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { isApiUrl } from '../helpers/api-url';

const ANONYMOUS_ENDPOINTS = ['/auth/login', '/auth/register'];

// Attaches the bearer token to every request except the anonymous auth endpoints, and signs
// the user out on a 401 (there is no refresh token to retry with — see AuthService).
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiUrl(req.url)) return next(req);
  const auth = inject(AuthService);
  const router = inject(Router);

  const path = new URL(req.url, document.baseURI).pathname;
  const isAnonymous = ANONYMOUS_ENDPOINTS.some((endpoint) => path.endsWith(endpoint));
  const token = isAnonymous ? null : auth.getAccessToken();
  const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(authedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Only a request that carried a token can represent an expired session worth bouncing to /login.
      // A 401 on a request sent with no token means we were already signed out - a poll still in flight
      // after sign-out, say - and redirecting there would override where sign-out is taking the person.
      // Routing for the signed-out case belongs to the route guard, which knows the target.
      if (error.status === 401 && !isAnonymous && token !== null && token === auth.getAccessToken()) {
        auth.logout();
        router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
      }
      return throwError(() => error);
    }),
  );
};
