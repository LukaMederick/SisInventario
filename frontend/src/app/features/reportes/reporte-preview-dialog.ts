import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface ReportePreviewData {
  titulo: string;
  columnas: string[];
  filas: (string | number)[][];
  resumen?: string;
}

@Component({
  selector: 'app-reporte-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <div class="p-6 w-full min-w-[360px] max-w-4xl">
      <div class="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
        <div>
          <h2 class="text-base font-bold text-slate-900">{{ data.titulo }}</h2>
          <p class="text-2xs text-slate-500 mt-0.5">Vista previa interactiva del reporte ({{ data.filas.length }} filas)</p>
        </div>
        <button type="button" mat-flat-button (click)="ref.close()">Cerrar</button>
      </div>

      <div class="overflow-x-auto max-h-96 border border-slate-200 rounded-xl">
        <table class="w-full text-left text-xs text-slate-600">
          <thead class="bg-slate-50 sticky top-0 border-b border-slate-200 font-semibold text-slate-700">
            <tr>
              @for (col of data.columnas; track col) {
                <th class="px-3.5 py-2.5">{{ col }}</th>
              }
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            @for (fila of data.filas; track $index) {
              <tr class="hover:bg-slate-50/70">
                @for (celda of fila; track $index) {
                  <td class="px-3.5 py-2.5 whitespace-nowrap">{{ celda }}</td>
                }
              </tr>
            } @empty {
              <tr>
                <td [attr.colspan]="data.columnas.length" class="px-4 py-8 text-center text-slate-400">
                  Sin datos para los filtros seleccionados.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      @if (data.resumen) {
        <div class="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs font-semibold text-indigo-900 text-right">
          {{ data.resumen }}
        </div>
      }
    </div>
  `
})
export class ReportePreviewDialogComponent {
  readonly data = inject<ReportePreviewData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ReportePreviewDialogComponent>);
}
