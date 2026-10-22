import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '@app/core/services/supabase.service';

export const authGuard: CanActivateFn = async () => {
  const supa = inject(SupabaseService);
  const router = inject(Router);

  const { data } = await supa.supabase.auth.getSession();

  if (data.session?.user) {
    return true;
  }

  return router.createUrlTree(['/auth/login']);
};
