import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CrudService } from '@app/core/services/crud.service';
import { SupabaseService } from '@app/core/services/supabase.service';

export interface AsignarAlmacenesDialogData {
  usuarioId: string;
  nombreUsuario: string;
  almacenesIds: number[];
}

@Component({
  selector: 'app-asignar-almacenes-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatCheckboxModule, MatButtonModule],
  template: `
    <div class="p-6 w-full min-w-[320px] max-w-md">
      <h2 class="text-base font-semibold text-slate-900 mb-1">Asignar Almacenes</h2>
      <p class="text-xs text-slate-500 mb-4">
        Usuario: <span class="font-semibold text-slate-700">{{ data.nombreUsuario }}</span>
      </p>

      @if (cargando()) {
        <p class="text-xs text-slate-400 py-6 text-center">Cargando almacenes…</p>
      } @else {
        <div class="space-y-2 max-h-60 overflow-y-auto pr-2 divide-y divide-slate-100">
          @for (alm of almacenes(); track alm.id) {
            <div class="flex items-center justify-between pt-2">
              <mat-checkbox [checked]="estaSeleccionado(alm.id)" (change)="toggleAlmacen(alm.id)" color="primary">
                <span class="text-xs font-medium text-slate-800">{{ alm.nombre }}</span>
                <span class="text-2xs text-slate-400 block">{{ alm.codigo }}</span>
              </mat-checkbox>
            </div>
          } @empty {
            <p class="text-xs text-slate-400">No hay almacenes activos.</p>
          }
        </div>

        <div class="flex justify-end gap-2 pt-5 border-t border-slate-100 mt-4">
          <button type="button" mat-button (click)="ref.close(false)">Cancelar</button>
          <button type="button" mat-flat-button color="primary" [disabled]="guardando()" (click)="guardar()">
            {{ guardando() ? 'Guardando…' : 'Guardar Asignación' }}
          </button>
        </div>
      }
    </div>
  `
})
export class AsignarAlmacenesDialogComponent implements OnInit {
  readonly data = inject<AsignarAlmacenesDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<AsignarAlmacenesDialogComponent>);
  private crud = inject(CrudService);
  private supa = inject(SupabaseService);
  private snack = inject(MatSnackBar);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly almacenes = signal<any[]>([]);
  readonly seleccionados = signal<Set<number>>(new Set());

  async ngOnInit(): Promise<void> {
    try {
      const rows = await this.crud.listar<any>('almacenes', { filters: { activo: true }, orderBy: { column: 'nombre' } });
      this.almacenes.set(rows);
      this.seleccionados.set(new Set(this.data.almacenesIds ?? []));
    } finally {
      this.cargando.set(false);
    }
  }

  estaSeleccionado(id: number): boolean {
    return this.seleccionados().has(id);
  }

  toggleAlmacen(id: number): void {
    const s = new Set(this.seleccionados());
    if (s.has(id)) s.delete(id);
    else s.add(id);
    this.seleccionados.set(s);
  }

  async guardar(): Promise<void> {
    this.guardando.set(true);
    const userId = this.data.usuarioId;
    const arrayIds = Array.from(this.seleccionados());

    try {
      // Borrar anteriores
      const { error: delError } = await this.supa.supabase
        .from('usuario_almacen')
        .delete()
        .eq('usuario_id', userId);
      if (delError) throw delError;

      // Insertar nuevos si hay
      if (arrayIds.length > 0) {
        const payload = arrayIds.map(almId => ({
          usuario_id: userId,
          almacen_id: almId
        }));
        const { error: insError } = await this.supa.supabase
          .from('usuario_almacen')
          .insert(payload);
        if (insError) throw insError;
      }

      this.snack.open('Almacenes asignados correctamente', 'OK', { duration: 2500 });
      this.ref.close(true);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al guardar asignaciones', 'Cerrar', { duration: 4000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
