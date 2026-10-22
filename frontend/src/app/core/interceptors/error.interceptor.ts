import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const snackBar = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse | any) => {
      // Ignorar llamadas silenciosas marcadas con encabezado especial
      if (req.headers.has('x-silent-error')) {
        return throwError(() => error);
      }

      let mensaje = 'Ha ocurrido un error inesperado';
      const status = error?.status;
      const errorMsg = error?.error?.message || error?.message || '';

      if (!navigator.onLine || status === 0) {
        mensaje = 'Sin conexión a internet. Verifica tu red.';
      } else if (status === 401 || errorMsg.includes('JWT expired') || errorMsg.includes('invalid claim')) {
        mensaje = 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.';
        router.navigate(['/login']);
      } else if (status === 403 || errorMsg.includes('permission denied')) {
        mensaje = 'No tienes permisos para realizar esta acción.';
      } else if (status === 404) {
        mensaje = 'Recurso no encontrado.';
      } else if (status >= 500) {
        mensaje = 'Error del servidor. Por favor intenta de nuevo más tarde.';
      } else if (error?.error?.error_description || error?.error?.message) {
        mensaje = error.error.error_description || error.error.message;
      }

      snackBar.open(mensaje, 'Cerrar', {
        duration: 4500,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
        panelClass: ['bg-slate-900', 'text-white']
      });

      return throwError(() => error);
    })
  );
};
