import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

let globalSnackBar: MatSnackBar | null = null;

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private snack = inject(MatSnackBar);

  constructor() {
    globalSnackBar = this.snack;
  }

  ok(mensaje: string, duracion = 3000): void {
    this.snack.open(mensaje, 'OK', {
      duration: duracion,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['toast-ok']
    });
  }

  error(mensaje: string, duracion = 4500): void {
    this.snack.open(mensaje, 'Cerrar', {
      duration: duracion,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['toast-error']
    });
  }

  info(mensaje: string, duracion = 3000): void {
    this.snack.open(mensaje, 'Entendido', {
      duration: duracion,
      horizontalPosition: 'end',
      verticalPosition: 'bottom',
      panelClass: ['toast-info']
    });
  }
}

/**
 * Funciones de utilidad para invocar toasts
 */
export function toastOk(msg: string, duracion = 3000): void {
  if (globalSnackBar) {
    globalSnackBar.open(msg, 'OK', { duration: duracion, horizontalPosition: 'end', verticalPosition: 'bottom' });
  }
}

export function toastError(msg: string, duracion = 4500): void {
  if (globalSnackBar) {
    globalSnackBar.open(msg, 'Cerrar', { duration: duracion, horizontalPosition: 'end', verticalPosition: 'bottom' });
  }
}

export function toastInfo(msg: string, duracion = 3000): void {
  if (globalSnackBar) {
    globalSnackBar.open(msg, 'Entendido', { duration: duracion, horizontalPosition: 'end', verticalPosition: 'bottom' });
  }
}
