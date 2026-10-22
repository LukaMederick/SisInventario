import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';
import { RolNombre } from '@app/core/models/models';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const allowedRoles = route.data['roles'] as RolNombre[] | undefined;

  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  if (auth.hasRole(allowedRoles)) {
    return true;
  }

  return router.createUrlTree(['/dashboard']);
};
