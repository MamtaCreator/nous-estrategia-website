import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user.model';

// Usage: { path: '...', canActivate: [roleGuard], data: { roles: ['Admin'] as UserRole[] } }
export const roleGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const requiredRoles = route.data['roles'] as UserRole[] | undefined;
  if (!requiredRoles || requiredRoles.length === 0) return true;

  const role = auth.userRole();
  if (role && requiredRoles.includes(role)) return true;

  return router.createUrlTree(['/app/unauthorized']);
};
