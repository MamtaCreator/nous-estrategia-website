import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../services/notification.service';
import { isApiUrl } from '../helpers/api-url';

// Surfaces every failed request as a toast, reading the backend's { error: { code, message } }
// envelope when present and falling back to a generic message by status code otherwise.
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isApiUrl(req.url)) return next(req);
  const notifications = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const backendMessage = error.error?.error?.message ?? error.error?.message;
      const message = backendMessage ?? fallbackMessage(error.status);
      notifications.error(message);
      return throwError(() => error);
    }),
  );
};

function fallbackMessage(status: number): string {
  switch (status) {
    case 0:
      return 'Could not reach the server. Check your connection.';
    case 400:
      return 'Bad request.';
    case 401:
      return 'Your session has expired. Please log in again.';
    case 403:
      return 'You do not have permission to do that.';
    case 404:
      return 'Not found.';
    case 409:
      return 'That conflicts with an existing record.';
    case 429:
      return 'Too many requests. Please wait and try again.';
    case 500:
      return 'Server error. Please try again later.';
    default:
      return 'Something went wrong.';
  }
}
