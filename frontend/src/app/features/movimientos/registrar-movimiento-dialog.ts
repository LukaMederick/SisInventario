import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CrudService } from '@app/core/services/crud.service';
import { AuthService } from '@app/core/services/auth.service';

@Component({
  selector: 'app-registrar-movimiento-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatSelectModule, MatInputModule, MatButtonModule
  ],
  template: `
    <div class="p-6 w-full min-w-[340px] max-w-lg">
      <h2 class="text-base font-semibold text-slate-900 mb-4">Registrar Movimiento</h2>

      @if (cargando()) {
        <p class="text-sm text-slate-500 py-6 text-center">Cargando opciones…</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="guardar()" class="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Tipo de movimiento</mat-label>
            <mat-select formControlName="tipo">
              <mat-option value="entrada">Entrada</mat-option>
              <mat-option value="salida">Salida</mat-option>
              <mat-option value="transferencia">Transferencia</mat-option>
              <mat-option value="ajuste">Ajuste</mat-option>
              <mat-option value="asignacion">Asignación</mat-option>
              <mat-option value="devolucion">Devolución</mat-option>
              <mat-option value="baja">Baja</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Aplica a</mat-label>
            <mat-select formControlName="entidad_tipo">
              <mat-option value="activo">Activo (Equipo)</mat-option>
              <mat-option value="item">Ítem (Insumo)</mat-option>
            </mat-select>
          </mat-form-field>

          @if (form.controls.entidad_tipo.value === 'activo') {
            <mat-form-field appearance="outline" class="w-full sm:col-span-2">
              <mat-label>Activo</mat-label>
              <mat-select formControlName="activo_id">
                @for (op of activos(); track op.value) {
                  <mat-option [value]="op.value">{{ op.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          } @else {
            <mat-form-field appearance="outline" class="w-full sm:col-span-2">
              <mat-label>Ítem</mat-label>
              <mat-select formControlName="item_id">
                @for (op of items(); track op.value) {
                  <mat-option [value]="op.value">{{ op.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Cantidad</mat-label>
            <input matInput type="number" formControlName="cantidad" min="1" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Documento</mat-label>
            <input matInput formControlName="documento" placeholder="Opcional" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Almacén origen</mat-label>
            <mat-select formControlName="almacen_origen_id">
              <mat-option [value]="null">— Ninguno —</mat-option>
              @for (op of almacenes(); track op.value) {
                <mat-option [value]="op.value">{{ op.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Almacén destino</mat-label>
            <mat-select formControlName="almacen_destino_id">
              <mat-option [value]="null">— Ninguno —</mat-option>
              @for (op of almacenes(); track op.value) {
                <mat-option [value]="op.value">{{ op.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          @if (form.controls.tipo.value === 'asignacion') {
            <mat-form-field appearance="outline" class="w-full sm:col-span-2">
              <mat-label>Usuario destino</mat-label>
              <mat-select formControlName="usuario_destino_id">
                @for (op of usuarios(); track op.value) {
                  <mat-option [value]="op.value">{{ op.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          }

          <mat-form-field appearance="outline" class="w-full sm:col-span-2">
            <mat-label>Motivo</mat-label>
            <textarea matInput formControlName="motivo" rows="2" placeholder="Motivo del movimiento"></textarea>
            @if (form.controls.motivo.touched && form.controls.motivo.invalid) {
              <mat-error>El motivo es obligatorio</mat-error>
            }
          </mat-form-field>

          <div class="sm:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" mat-button (click)="ref.close(false)">Cancelar</button>
            <button type="submit" mat-flat-button color="primary" [disabled]="guardando()">
              {{ guardando() ? 'Guardando…' : 'Registrar' }}
            </button>
          </div>
        </form>
      }
    </div>
  `
})
export class RegistrarMovimientoDialogComponent implements OnInit {
  readonly ref = inject(MatDialogRef<RegistrarMovimientoDialogComponent>);
  private crud = inject(CrudService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly almacenes = signal<{ value: number; label: string }[]>([]);
  readonly activos = signal<{ value: number; label: string }[]>([]);
  readonly items = signal<{ value: number; label: string }[]>([]);
  readonly usuarios = signal<{ value: string; label: string }[]>([]);

  readonly form = this.fb.nonNullable.group({
    tipo: ['ajuste', Validators.required],
    entidad_tipo: ['activo' as 'activo' | 'item', Validators.required],
    activo_id: [null as number | null],
    item_id: [null as number | null],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    almacen_origen_id: [null as number | null],
    almacen_destino_id: [null as number | null],
    usuario_destino_id: [null as string | null],
    motivo: ['', Validators.required],
    documento: ['']
  });

  async ngOnInit(): Promise<void> {
    try {
      const [almRows, actRows, itemRows, userRows] = await Promise.all([
        this.crud.listar<any>('almacenes', { filters: { activo: true }, orderBy: { column: 'nombre' } }),
        this.crud.listar<any>('activos', { filters: { activo: true }, orderBy: { column: 'codigo_activo' } }),
        this.crud.listar<any>('items', { filters: { activo: true }, orderBy: { column: 'nombre' } }),
        this.crud.listar<any>('usuarios', { filters: { activo: true }, orderBy: { column: 'nombre_completo' } })
      ]);
      this.almacenes.set(almRows.map(a => ({ value: a.id, label: a.nombre })));
      this.activos.set(actRows.map(a => ({ value: a.id, label: `${a.codigo_activo} — ${a.numero_serie}` })));
      this.items.set(itemRows.map(i => ({ value: i.id, label: `${i.sku} — ${i.nombre}` })));
      this.usuarios.set(userRows.map(u => ({ value: u.id, label: u.nombre_completo })));
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const userId = this.auth.currentUser()?.id ?? null;
    const v = this.form.getRawValue();

    try {
      await this.crud.crear('movimientos', {
        tipo: v.tipo,
        activo_id: v.entidad_tipo === 'activo' ? v.activo_id : null,
        item_id: v.entidad_tipo === 'item' ? v.item_id : null,
        cantidad: Number(v.cantidad),
        almacen_origen_id: v.almacen_origen_id || null,
        almacen_destino_id: v.almacen_destino_id || null,
        usuario_destino_id: v.usuario_destino_id || null,
        motivo: v.motivo,
        documento: v.documento || null,
        created_by: userId
      });

      this.snack.open('Movimiento registrado', 'OK', { duration: 2500 });
      this.ref.close(true);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al registrar movimiento', 'Cerrar', { duration: 4000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
