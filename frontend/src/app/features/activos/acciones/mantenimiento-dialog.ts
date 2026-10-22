import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CrudService } from '@app/core/services/crud.service';
import { AuthService } from '@app/core/services/auth.service';
import { estadoIdPorNombre, toOpt } from './activo-acciones.util';

export interface MantenimientoDialogData {
  activoId?: number | null;
}

@Component({
  selector: 'app-mantenimiento-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule],
  template: `
    <div class="p-6 w-full min-w-[340px] max-w-lg">
      <h2 class="text-base font-semibold text-slate-900 mb-4">Registrar mantenimiento</h2>
      @if (cargando()) {
        <p class="text-sm text-slate-500 py-6 text-center">Cargando…</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="guardar()" class="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
          @if (!data.activoId) {
            <mat-form-field appearance="outline" class="w-full sm:col-span-2">
              <mat-label>Activo (Equipo)</mat-label>
              <mat-select formControlName="activo_id">
                @for (op of activos(); track op.value) {
                  <mat-option [value]="op.value">{{ op.label }}</mat-option>
                }
              </mat-select>
              @if (form.controls.activo_id.touched && form.controls.activo_id.invalid) {
                <mat-error>El activo es obligatorio</mat-error>
              }
            </mat-form-field>
          }
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Tipo</mat-label>
            <mat-select formControlName="tipo">
              <mat-option value="preventivo">Preventivo</mat-option>
              <mat-option value="correctivo">Correctivo</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Estado</mat-label>
            <mat-select formControlName="estado">
              <mat-option value="pendiente">Pendiente</mat-option>
              <mat-option value="en_proceso">En proceso</mat-option>
              <mat-option value="completado">Completado</mat-option>
              <mat-option value="cancelado">Cancelado</mat-option>
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full sm:col-span-2">
            <mat-label>Descripción</mat-label>
            <textarea matInput formControlName="descripcion" rows="2"></textarea>
            @if (form.controls.descripcion.touched && form.controls.descripcion.invalid) {
              <mat-error>Obligatoria</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Proveedor</mat-label>
            <mat-select formControlName="proveedor_id">
              <mat-option [value]="null">— Ninguno —</mat-option>
              @for (op of proveedores(); track op.value) {
                <mat-option [value]="op.value">{{ op.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Costo</mat-label>
            <input matInput type="number" formControlName="costo" min="0" step="0.01" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Fecha inicio</mat-label>
            <input matInput type="date" formControlName="fecha_inicio" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Fecha fin</mat-label>
            <input matInput type="date" formControlName="fecha_fin" />
          </mat-form-field>
          <div class="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" mat-button (click)="ref.close(false)">Cancelar</button>
            <button type="submit" mat-flat-button color="primary" [disabled]="guardando()">Guardar</button>
          </div>
        </form>
      }
    </div>
  `
})
export class MantenimientoDialogComponent implements OnInit {
  readonly data = inject<MantenimientoDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  readonly ref = inject(MatDialogRef<MantenimientoDialogComponent>);
  private crud = inject(CrudService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly proveedores = signal<{ value: any; label: string }[]>([]);
  readonly activos = signal<{ value: any; label: string }[]>([]);

  readonly form = this.fb.nonNullable.group({
    activo_id: [this.data?.activoId ?? null as number | null, this.data?.activoId ? [] : [Validators.required]],
    tipo: ['preventivo' as 'preventivo' | 'correctivo', Validators.required],
    descripcion: ['', Validators.required],
    proveedor_id: [null as number | null],
    costo: [0 as number | null],
    fecha_inicio: [new Date().toISOString().slice(0, 10), Validators.required],
    fecha_fin: [''],
    estado: ['pendiente' as string, Validators.required]
  });

  async ngOnInit(): Promise<void> {
    try {
      const [provRows, actRows] = await Promise.all([
        this.crud.listar<any>('proveedores', { orderBy: { column: 'nombre' } }),
        !this.data?.activoId
          ? this.crud.listar<any>('activos', { filters: { activo: true }, orderBy: { column: 'codigo_activo' } })
          : Promise.resolve([])
      ]);
      this.proveedores.set(toOpt(provRows));
      this.activos.set(actRows.map(a => ({ value: a.id, label: `${a.codigo_activo} — ${a.numero_serie}` })));
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const userId = this.auth.currentUser()?.id ?? null;
    const v = this.form.getRawValue();
    const targetActivoId = this.data?.activoId ?? v.activo_id;
    if (!targetActivoId) {
      this.snack.open('Seleccione un activo válido', 'Cerrar', { duration: 3000 });
      this.guardando.set(false);
      return;
    }

    try {
      const estadoId = await estadoIdPorNombre(this.crud, 'Mantenimiento');
      await this.crud.crear('mantenimientos', {
        activo_id: targetActivoId,
        tipo: v.tipo,
        descripcion: v.descripcion,
        proveedor_id: v.proveedor_id || null,
        costo: v.costo ?? 0,
        fecha_inicio: v.fecha_inicio,
        fecha_fin: v.fecha_fin || null,
        estado: v.estado,
        created_by: userId
      });
      await this.crud.actualizar('activos', targetActivoId, { estado_id: estadoId });
      await this.crud.crear('movimientos', {
        tipo: 'ajuste',
        activo_id: targetActivoId,
        motivo: 'Envío a mantenimiento',
        created_by: userId
      });
      this.snack.open('Mantenimiento registrado', 'OK', { duration: 2500 });
      this.ref.close(true);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al guardar', 'Cerrar', { duration: 4000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
