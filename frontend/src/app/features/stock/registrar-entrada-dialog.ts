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

export interface RegistrarEntradaDialogData {
  almacenId?: number | null;
}

@Component({
  selector: 'app-registrar-entrada-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatSelectModule, MatInputModule, MatButtonModule
  ],
  template: `
    <div class="p-6 w-full min-w-[340px] max-w-md">
      <h2 class="text-base font-semibold text-slate-900 mb-4">Registrar Entrada de Stock</h2>

      @if (cargando()) {
        <p class="text-sm text-slate-500 py-6 text-center">Cargando ítems y almacenes…</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="guardar()" class="space-y-1">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Almacén destino</mat-label>
            <mat-select formControlName="almacen_id">
              @for (op of almacenes(); track op.value) {
                <mat-option [value]="op.value">{{ op.label }}</mat-option>
              }
            </mat-select>
            @if (form.controls.almacen_id.touched && form.controls.almacen_id.invalid) {
              <mat-error>Obligatorio</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Ítem (Insumo)</mat-label>
            <mat-select formControlName="item_id">
              @for (op of items(); track op.value) {
                <mat-option [value]="op.value">{{ op.label }}</mat-option>
              }
            </mat-select>
            @if (form.controls.item_id.touched && form.controls.item_id.invalid) {
              <mat-error>Obligatorio</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Cantidad</mat-label>
            <input matInput type="number" formControlName="cantidad" min="1" placeholder="Ej: 20" />
            @if (form.controls.cantidad.touched && form.controls.cantidad.invalid) {
              <mat-error>Debe ingresar un número mayor a 0</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Documento de referencia</mat-label>
            <input matInput formControlName="documento" placeholder="Ej: FAC-001, GUIA-123" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Motivo / Observaciones</mat-label>
            <textarea matInput formControlName="motivo" rows="2" placeholder="Opcional"></textarea>
          </mat-form-field>

          <div class="flex justify-end gap-2 pt-2">
            <button type="button" mat-button (click)="ref.close(false)">Cancelar</button>
            <button type="submit" mat-flat-button color="primary" [disabled]="guardando()">
              {{ guardando() ? 'Guardando…' : 'Registrar Entrada' }}
            </button>
          </div>
        </form>
      }
    </div>
  `
})
export class RegistrarEntradaDialogComponent implements OnInit {
  readonly data = inject<RegistrarEntradaDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<RegistrarEntradaDialogComponent>);
  private supa = inject(SupabaseService);
  private crud = inject(CrudService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly items = signal<{ value: number; label: string }[]>([]);
  readonly almacenes = signal<{ value: number; label: string }[]>([]);

  readonly form = this.fb.nonNullable.group({
    item_id: [null as number | null, Validators.required],
    almacen_id: [this.data?.almacenId ?? (null as number | null), Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    documento: [''],
    motivo: ['']
  });

  async ngOnInit(): Promise<void> {
    try {
      const [itRows, almRows] = await Promise.all([
        this.crud.listar<any>('items', { filters: { activo: true }, orderBy: { column: 'nombre' } }),
        this.crud.listar<any>('almacenes', { filters: { activo: true }, orderBy: { column: 'nombre' } })
      ]);
      this.items.set(itRows.map(i => ({ value: i.id, label: `${i.sku} — ${i.nombre}` })));
      this.almacenes.set(almRows.map(a => ({ value: a.id, label: a.nombre })));
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
    const { item_id, almacen_id, cantidad, documento, motivo } = this.form.getRawValue();

    try {
      // Intentar RPC registrar_entrada_inventario (Iteración 9)
      const docRef = documento || motivo || null;
      const { error } = await this.supa.supabase.rpc('registrar_entrada_inventario', {
        p_item_id: item_id,
        p_almacen_id: almacen_id,
        p_cantidad: Number(cantidad),
        p_documento: docRef
      });

      if (error) {
        // Fallback manual en caso de que la RPC no esté disponible
        const userId = this.auth.currentUser()?.id ?? null;
        const exist = await this.crud.listar<any>('stock', {
          filters: { item_id, almacen_id }
        });

        if (exist.length > 0) {
          const actual = exist[0];
          const nuevaCantidad = Number(actual.cantidad) + Number(cantidad);
          await this.crud.actualizar('stock', actual.id, {
            cantidad: nuevaCantidad,
            ultimo_conteo: new Date().toISOString()
          });
        } else {
          await this.crud.crear('stock', {
            item_id,
            almacen_id,
            cantidad: Number(cantidad),
            cantidad_reservada: 0,
            ultimo_conteo: new Date().toISOString()
          });
        }

        await this.crud.crear('movimientos', {
          tipo: 'entrada',
          item_id,
          cantidad: Number(cantidad),
          almacen_destino_id: almacen_id,
          documento: documento || null,
          motivo: motivo || (documento ? `Entrada según doc ${documento}` : 'Registro de entrada'),
          created_by: userId
        });
      }

      this.snack.open('Entrada de stock registrada exitosamente', 'OK', { duration: 2500 });
      this.ref.close(true);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al registrar entrada', 'Cerrar', { duration: 4000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
