import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

export interface ConfirmDialogData {
  titulo: string;
  mensaje: string;
  labelConfirmar?: string;
  labelCancelar?: string;
  tipo?: 'danger' | 'warning' | 'info';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  template: `
    <div class="p-6 max-w-sm w-full">
      <!-- Icon -->
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          [class.bg-red-100]="data.tipo !== 'warning' && data.tipo !== 'info'"
          [class.bg-amber-100]="data.tipo === 'warning'"
          [class.bg-blue-100]="data.tipo === 'info'"
        >
          @if (data.tipo === 'warning') {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-amber-600">
              <path fill-rule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd" />
            </svg>
          } @else {
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-red-600">
              <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clip-rule="evenodd" />
            </svg>
          }
        </div>
        <h3 class="text-base font-semibold text-slate-900">{{ data.titulo }}</h3>
      </div>

      <p class="text-sm text-slate-600 mb-6">{{ data.mensaje }}</p>

      <div class="flex justify-end gap-3">
        <button
          (click)="dialogRef.close(false)"
          type="button"
          class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition cursor-pointer"
        >
          {{ data.labelCancelar ?? 'Cancelar' }}
        </button>
        <button
          (click)="dialogRef.close(true)"
          type="button"
          class="px-5 py-2 text-sm font-semibold text-white rounded-xl shadow-md transition cursor-pointer"
          [class.bg-red-600]="data.tipo !== 'warning' && data.tipo !== 'info'"
          [class.hover:bg-red-700]="data.tipo !== 'warning' && data.tipo !== 'info'"
          [class.bg-amber-500]="data.tipo === 'warning'"
          [class.hover:bg-amber-600]="data.tipo === 'warning'"
          [class.bg-indigo-600]="data.tipo === 'info'"
          [class.hover:bg-indigo-700]="data.tipo === 'info'"
        >
          {{ data.labelConfirmar ?? 'Eliminar' }}
        </button>
      </div>
    </div>
  `
})
export class ConfirmDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);
  readonly data = inject<ConfirmDialogData>(MAT_DIALOG_DATA);
}
