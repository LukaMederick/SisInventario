import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '@app/core/services/supabase.service';
import { CrudService } from '@app/core/services/crud.service';
import { AuthService } from '@app/core/services/auth.service';
import { estadoIdPorNombre, toOpt } from './activo-acciones.util';

export interface AsignarDialogData {
  activoId: number;
  almacenId: number;
}

@Component({
  selector: 'app-asignar-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule],
  template: `
    <div class="p-6 w-full min-w-[320px] max-w-md">
      <h2 class="text-base font-semibold text-slate-900 mb-4">Asignar activo</h2>
      @if (cargando()) {
        <p class="text-sm text-slate-500 py-6 text-center">Cargando usuarios…</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="guardar()" class="space-y-1">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Usuario</mat-label>
            <mat-select formControlName="asignado_a">
              @for (op of usuarios(); track op.value) {
                <mat-option [value]="op.value">{{ op.label }}</mat-option>
              }
            </mat-select>
            @if (form.controls.asignado_a.touched && form.controls.asignado_a.invalid) {
              <mat-error>Obligatorio</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Notas</mat-label>
            <textarea matInput formControlName="notas" rows="3"></textarea>
          </mat-form-field>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" mat-button (click)="ref.close(false)">Cancelar</button>
            <button type="submit" mat-flat-button color="primary" [disabled]="guardando()">Asignar</button>
          </div>
        </form>
      }
    </div>
  `
})
export class AsignarDialogComponent implements OnInit {
  readonly data = inject<AsignarDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<AsignarDialogComponent>);
  private supa = inject(SupabaseService);
  private crud = inject(CrudService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly usuarios = signal<{ value: any; label: string }[]>([]);

  readonly form = this.fb.nonNullable.group({
    asignado_a: ['', Validators.required],
    notas: ['']
  });

  async ngOnInit(): Promise<void> {
    try {
      const rows = await this.crud.listar<any>('usuarios', {
        filters: { activo: true },
        orderBy: { column: 'nombre_completo' }
      });
      this.usuarios.set(toOpt(rows, 'nombre_completo'));
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const { asignado_a, notas } = this.form.getRawValue();

    try {
      // Intentar llamada RPC atómica (Iteración 9)
      const { error } = await this.supa.supabase.rpc('asignar_equipo', {
        p_activo_id: this.data.activoId,
        p_usuario_id: asignado_a,
        p_notas: notas || null
      });

      if (error) {
        // Fallback en caso de que la RPC aún no haya sido ejecutada en Supabase
        const userId = this.auth.currentUser()?.id ?? null;
        const estadoId = await estadoIdPorNombre(this.crud, 'Asignado');
        const prev = await this.crud.listar<any>('asignaciones', {
          filters: { activo_id: this.data.activoId, estado: 'activa' }
        });
        for (const a of prev) {
          await this.crud.actualizar('asignaciones', a.id, {
            estado: 'finalizada',
            fecha_devolucion: new Date().toISOString()
          } as any, { sinUpdatedAt: true });
        }
        await this.crud.actualizar('activos', this.data.activoId, {
          estado_id: estadoId,
          asignado_a
        });
        await this.crud.crear('asignaciones', {
          activo_id: this.data.activoId,
          asignado_a,
          almacen_id: this.data.almacenId,
          estado: 'activa',
          notas: notas || null,
          created_by: userId
        });
        await this.crud.crear('movimientos', {
          tipo: 'asignacion',
          activo_id: this.data.activoId,
          usuario_destino_id: asignado_a,
          created_by: userId
        });
      }

      this.snack.open('Activo asignado exitosamente', 'OK', { duration: 2500 });
      this.ref.close(true);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al asignar', 'Cerrar', { duration: 4000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
