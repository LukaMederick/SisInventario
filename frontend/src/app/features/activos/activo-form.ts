import { Component, inject, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { CrudService } from '@app/core/services/crud.service';
import { AuthService } from '@app/core/services/auth.service';

export interface ActivoFormData {
  activo?: Record<string, any> | null;
}

interface Opt { value: any; label: string }

@Component({
  selector: 'app-activo-form',
  standalone: true,
  imports: [
    TitleCasePipe, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatCheckboxModule, MatButtonModule
  ],
  template: `
    <div class="w-full min-w-[360px] max-w-2xl">
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 class="text-base font-semibold text-slate-900">
          {{ data.activo?.['id'] ? 'Editar Activo' : 'Nuevo Activo' }}
        </h2>
        <button type="button" (click)="cancelar()"
          class="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      @if (cargando()) {
        <div class="px-6 py-12 text-center text-sm text-slate-500">Cargando opciones…</div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="guardar()" class="px-6 py-5">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Código de activo</mat-label>
              <input matInput formControlName="codigo_activo" placeholder="ACT-001" />
              @if (form.controls.codigo_activo.touched && form.controls.codigo_activo.hasError('required')) {
                <mat-error>Obligatorio</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Número de serie</mat-label>
              <input matInput formControlName="numero_serie" placeholder="SN123456" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Modelo</mat-label>
              <mat-select formControlName="modelo_id">
                @for (op of modelos(); track op.value) {
                  <mat-option [value]="op.value">{{ op.label }}</mat-option>
                }
              </mat-select>
              @if (form.controls.modelo_id.touched && form.controls.modelo_id.hasError('required')) {
                <mat-error>Obligatorio</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Almacén</mat-label>
              <mat-select formControlName="almacen_id">
                @for (op of almacenes(); track op.value) {
                  <mat-option [value]="op.value">{{ op.label }}</mat-option>
                }
              </mat-select>
              @if (form.controls.almacen_id.touched && form.controls.almacen_id.hasError('required')) {
                <mat-error>Obligatorio</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Estado</mat-label>
              <mat-select formControlName="estado_id">
                @for (op of estados(); track op.value) {
                  <mat-option [value]="op.value">{{ op.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Proveedor</mat-label>
              <mat-select formControlName="proveedor_id">
                <mat-option [value]="null">— Sin proveedor —</mat-option>
                @for (op of proveedores(); track op.value) {
                  <mat-option [value]="op.value">{{ op.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Fecha de compra</mat-label>
              <input matInput type="date" formControlName="fecha_compra" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Precio</mat-label>
              <input matInput type="number" formControlName="precio" min="0" step="0.01" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Garantía hasta</mat-label>
              <input matInput type="date" formControlName="garantia_hasta" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Condición</mat-label>
              <mat-select formControlName="condicion">
                @for (c of condiciones; track c) {
                  <mat-option [value]="c">{{ c | titlecase }}</mat-option>
                }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full sm:col-span-2">
              <mat-label>Ubicación detalle</mat-label>
              <input matInput formControlName="ubicacion_detalle" placeholder="Piso 2, Sala B, Estante 3" />
            </mat-form-field>

            <mat-form-field appearance="outline" class="w-full sm:col-span-2">
              <mat-label>Notas</mat-label>
              <textarea matInput formControlName="notas" rows="2"></textarea>
            </mat-form-field>

            <div class="sm:col-span-2 flex items-center py-2">
              <mat-checkbox formControlName="activo" color="primary">Activo operativo</mat-checkbox>
            </div>
          </div>

          <div class="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
            <button type="button" (click)="cancelar()"
              class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50">
              Cancelar
            </button>
            <button type="submit"
              class="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer">
              Guardar
            </button>
          </div>
        </form>
      }
    </div>
  `
})
export class ActivoFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private crud = inject(CrudService);
  private auth = inject(AuthService);
  readonly data = inject<ActivoFormData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ActivoFormComponent>);

  readonly cargando = signal(true);
  readonly modelos = signal<Opt[]>([]);
  readonly almacenes = signal<Opt[]>([]);
  readonly estados = signal<Opt[]>([]);
  readonly proveedores = signal<Opt[]>([]);
  readonly condiciones = ['nuevo', 'bueno', 'regular', 'malo'] as const;

  readonly form = this.fb.nonNullable.group({
    codigo_activo: ['', Validators.required],
    numero_serie: [''],
    modelo_id: [null as number | null, Validators.required],
    almacen_id: [null as number | null, Validators.required],
    estado_id: [null as number | null],
    proveedor_id: [null as number | null],
    fecha_compra: [''],
    precio: [null as number | null],
    garantia_hasta: [''],
    condicion: ['nuevo' as string],
    ubicacion_detalle: [''],
    notas: [''],
    activo: [true]
  });

  async ngOnInit(): Promise<void> {
    try {
      const [mods, alms, ests, provs] = await Promise.all([
        this.crud.listar<any>('modelos', { select: 'id, nombre, marcas(nombre)', orderBy: { column: 'nombre' } }),
        this.crud.listar<any>('almacenes', { orderBy: { column: 'nombre' } }),
        this.crud.listar<any>('estados_equipo', { orderBy: { column: 'nombre' } }),
        this.crud.listar<any>('proveedores', { orderBy: { column: 'nombre' } })
      ]);
      this.modelos.set(mods.map(m => ({
        value: m.id,
        label: m.marcas?.nombre ? `${m.marcas.nombre} — ${m.nombre}` : m.nombre
      })));
      this.almacenes.set(alms.map(a => ({ value: a.id, label: a.nombre })));
      this.estados.set(ests.map(e => ({ value: e.id, label: e.nombre })));
      this.proveedores.set(provs.map(p => ({ value: p.id, label: p.nombre })));

      const a = this.data.activo;
      if (a) {
        this.form.patchValue({
          codigo_activo: a['codigo_activo'] ?? '',
          numero_serie: a['numero_serie'] ?? '',
          modelo_id: a['modelo_id'] ?? null,
          almacen_id: a['almacen_id'] ?? null,
          estado_id: a['estado_id'] ?? null,
          proveedor_id: a['proveedor_id'] ?? null,
          fecha_compra: a['fecha_compra']?.toString().slice(0, 10) ?? '',
          precio: a['precio'] ?? null,
          garantia_hasta: a['garantia_hasta']?.toString().slice(0, 10) ?? '',
          condicion: a['condicion'] ?? 'nuevo',
          ubicacion_detalle: a['ubicacion_detalle'] ?? '',
          notas: a['notas'] ?? '',
          activo: a['activo'] ?? true
        });
      } else {
        const disp = ests.find((e: any) =>
          String(e.nombre).toLowerCase() === 'disponible'
        );
        if (disp) this.form.patchValue({ estado_id: disp.id });
      }
    } finally {
      this.cargando.set(false);
    }
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      ...raw,
      precio: raw.precio === null || raw.precio === ('' as any) ? null : Number(raw.precio),
      proveedor_id: raw.proveedor_id || null,
      fecha_compra: raw.fecha_compra || null,
      garantia_hasta: raw.garantia_hasta || null
    };
    if (!this.data.activo?.['id']) {
      payload['created_by'] = this.auth.currentUser()?.id ?? null;
    }
    this.dialogRef.close(payload);
  }

  cancelar(): void { this.dialogRef.close(null); }
}
