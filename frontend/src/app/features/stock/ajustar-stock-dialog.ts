import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SupabaseService } from '@app/core/services/supabase.service';
import { CrudService } from '@app/core/services/crud.service';
import { AuthService } from '@app/core/services/auth.service';

export interface AjustarStockDialogData {
  stockId: number;
  itemId: number;
  almacenId: number;
  itemNombre: string;
  itemSku: string;
  unidad: string;
  cantidadActual: number;
}

@Component({
  selector: 'app-ajustar-stock-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatButtonModule
  ],
  template: `
    <div class="p-6 w-full min-w-[320px] max-w-md">
      <h2 class="text-base font-semibold text-slate-900 mb-1">Ajustar Stock</h2>
      <p class="text-xs text-slate-500 mb-4">
        Ítem: <span class="font-semibold text-slate-700">{{ data.itemNombre }} ({{ data.itemSku }})</span>
      </p>

      <form [formGroup]="form" (ngSubmit)="guardar()" class="space-y-2">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Cantidad actual</mat-label>
          <input matInput [value]="data.cantidadActual + ' ' + (data.unidad || 'uds')" disabled />
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nueva cantidad física</mat-label>
          <input matInput type="number" formControlName="cantidad_nueva" min="0" placeholder="0" />
          @if (form.controls.cantidad_nueva.touched && form.controls.cantidad_nueva.invalid) {
            <mat-error>Debe ingresar un valor mayor o igual a 0</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Motivo del ajuste</mat-label>
          <textarea matInput formControlName="motivo" rows="3" placeholder="Ej: merma, inventario físico, daño…"></textarea>
          @if (form.controls.motivo.touched && form.controls.motivo.invalid) {
            <mat-error>El motivo es obligatorio</mat-error>
          }
        </mat-form-field>

        <div class="flex justify-end gap-2 pt-2">
          <button type="button" mat-button (click)="ref.close(false)">Cancelar</button>
          <button type="submit" mat-flat-button color="primary" [disabled]="guardando()">
            {{ guardando() ? 'Guardando…' : 'Guardar Ajuste' }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class AjustarStockDialogComponent {
  readonly data = inject<AjustarStockDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<AjustarStockDialogComponent>);
  private supa = inject(SupabaseService);
  private crud = inject(CrudService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  readonly guardando = signal(false);

  readonly form = this.fb.nonNullable.group({
    cantidad_nueva: [this.data.cantidadActual, [Validators.required, Validators.min(0)]],
    motivo: ['', Validators.required]
  });

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const { cantidad_nueva, motivo } = this.form.getRawValue();

    try {
      // Intentar RPC ajustar_stock (Iteración 9)
      const { error } = await this.supa.supabase.rpc('ajustar_stock', {
        p_item_id: this.data.itemId,
        p_almacen_id: this.data.almacenId,
        p_cantidad: Number(cantidad_nueva),
        p_motivo: motivo
      });

      if (error) {
        // Fallback manual en caso de que la RPC no esté disponible
        const userId = this.auth.currentUser()?.id ?? null;
        const dif = Math.abs(Number(cantidad_nueva) - Number(this.data.cantidadActual));

        await this.crud.actualizar('stock', this.data.stockId, {
          cantidad: Number(cantidad_nueva),
          ultimo_conteo: new Date().toISOString()
        });

        await this.crud.crear('movimientos', {
          tipo: 'ajuste',
          item_id: this.data.itemId,
          cantidad: dif,
          almacen_origen_id: this.data.almacenId,
          motivo,
          created_by: userId
        });
      }

      this.snack.open('Stock ajustado correctamente', 'OK', { duration: 2500 });
      this.ref.close(true);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al ajustar stock', 'Cerrar', { duration: 4000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
