import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router } from '@angular/router';
import { AuthService } from '@app/core/services/auth.service';

export const warehouseGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const warehouseIdParam = route.paramMap.get('id') ?? route.queryParamMap.get('almacen_id');

  if (!warehouseIdParam) {
    return true;
  }

  const warehouseId = parseInt(warehouseIdParam, 10);
  if (isNaN(warehouseId)) {
    return router.createUrlTree(['/almacenes']);
  }

  if (auth.canAccessWarehouse(warehouseId)) {
    return true;
  }

  return router.createUrlTree(['/almacenes']);
};
