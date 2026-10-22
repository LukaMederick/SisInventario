import { Component, inject } from '@angular/core';
import { CommonModule, JsonPipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

export interface DiffDialogData {
  tabla: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  registroId: string;
  datosAnteriores?: any;
  datosNuevos?: any;
}

@Component({
  selector: 'app-diff-dialog',
  standalone: true,
  imports: [CommonModule, JsonPipe, MatDialogModule, MatButtonModule],
  template: `
    <div class="p-6 w-full min-w-[360px] max-w-2xl">
      <div class="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
        <div>
          <h2 class="text-base font-semibold text-slate-900">Detalle de Auditoría</h2>
          <p class="text-xs text-slate-500 mt-0.5">
            Tabla: <span class="font-semibold text-slate-700">{{ data.tabla }}</span> | 
            ID: <span class="font-mono text-slate-700">{{ data.registroId }}</span>
          </p>
        </div>
        <span class="px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider"
          [class.bg-emerald-100]="data.accion === 'INSERT'"
          [class.text-emerald-800]="data.accion === 'INSERT'"
          [class.bg-amber-100]="data.accion === 'UPDATE'"
          [class.text-amber-800]="data.accion === 'UPDATE'"
          [class.bg-rose-100]="data.accion === 'DELETE'"
          [class.text-rose-800]="data.accion === 'DELETE'">
          {{ data.accion }}
        </span>
      </div>

      <div class="grid gap-4" [class.grid-cols-2]="data.accion === 'UPDATE'" [class.grid-cols-1]="data.accion !== 'UPDATE'">
        @if (data.accion === 'UPDATE' || data.accion === 'DELETE') {
          <div>
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
              Estado Anterior
            </h3>
            <pre class="bg-slate-50 text-slate-800 p-3 rounded-xl border border-slate-200 text-2xs overflow-auto max-h-80 font-mono">{{ data.datosAnteriores | json }}</pre>
          </div>
        }

        @if (data.accion === 'UPDATE' || data.accion === 'INSERT') {
          <div>
            <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
              Estado Nuevo
            </h3>
            <pre class="bg-slate-50 text-slate-800 p-3 rounded-xl border border-slate-200 text-2xs overflow-auto max-h-80 font-mono">{{ data.datosNuevos | json }}</pre>
          </div>
        }
      </div>

      <div class="flex justify-end pt-5 border-t border-slate-100 mt-5">
        <button type="button" mat-flat-button (click)="ref.close()">Cerrar</button>
      </div>
    </div>
  `
})
export class DiffDialogComponent {
  readonly data = inject<DiffDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<DiffDialogComponent>);
}
