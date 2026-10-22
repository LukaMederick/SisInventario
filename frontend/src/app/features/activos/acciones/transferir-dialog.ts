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
import { toOpt } from './activo-acciones.util';

export interface TransferirDialogData {
  activoId: number;
  almacenOrigenId: number;
}

@Component({
  selector: 'app-transferir-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule],
  template: `
    <div class="p-6 w-full min-w-[320px] max-w-md">
      <h2 class="text-base font-semibold text-slate-900 mb-4">Transferir a otro almacén</h2>
      @if (cargando()) {
        <p class="text-sm text-slate-500 py-6 text-center">Cargando almacenes…</p>
      } @else {
        <form [formGroup]="form" (ngSubmit)="guardar()" class="space-y-1">
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Almacén destino</mat-label>
            <mat-select formControlName="almacen_destino_id">
              @for (op of almacenes(); track op.value) {
                <mat-option [value]="op.value">{{ op.label }}</mat-option>
              }
            </mat-select>
            @if (form.controls.almacen_destino_id.touched && form.controls.almacen_destino_id.invalid) {
              <mat-error>Obligatorio</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline" class="w-full">
            <mat-label>Motivo</mat-label>
            <textarea matInput formControlName="motivo" rows="3"></textarea>
          </mat-form-field>
          <div class="flex justify-end gap-2 pt-2">
            <button type="button" mat-button (click)="ref.close(false)">Cancelar</button>
            <button type="submit" mat-flat-button color="primary" [disabled]="guardando()">Transferir</button>
          </div>
        </form>
      }
    </div>
  `
})
export class TransferirDialogComponent implements OnInit {
  readonly data = inject<TransferirDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<TransferirDialogComponent>);
  private supa = inject(SupabaseService);
  private crud = inject(CrudService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  readonly cargando = signal(true);
  readonly guardando = signal(false);
  readonly almacenes = signal<{ value: any; label: string }[]>([]);

  readonly form = this.fb.nonNullable.group({
    almacen_destino_id: [null as number | null, Validators.required],
    motivo: ['']
  });

  async ngOnInit(): Promise<void> {
    try {
      const rows = await this.crud.listar<any>('almacenes', {
        filters: { activo: true },
        orderBy: { column: 'nombre' }
      });
      this.almacenes.set(
        toOpt(rows.filter((a: any) => a.id !== this.data.almacenOrigenId))
      );
    } finally {
      this.cargando.set(false);
    }
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const { almacen_destino_id, motivo } = this.form.getRawValue();

    try {
      // Intentar RPC atómica de transferencia
      const { error } = await this.supa.supabase.rpc('transferir_activo', {
        p_activo_id: this.data.activoId,
        p_almacen_destino: almacen_destino_id,
        p_motivo: motivo || null
      });

      if (error) {
        // Fallback en caso de que la RPC aún no haya sido ejecutada
        const userId = this.auth.currentUser()?.id ?? null;
        await this.crud.actualizar('activos', this.data.activoId, {
          almacen_id: almacen_destino_id
        });
        await this.crud.crear('movimientos', {
          tipo: 'transferencia',
          activo_id: this.data.activoId,
          almacen_origen_id: this.data.almacenOrigenId,
          almacen_destino_id,
          motivo: motivo || null,
          created_by: userId
        });
      }

      this.snack.open('Activo transferido exitosamente', 'OK', { duration: 2500 });
      this.ref.close(true);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al transferir', 'Cerrar', { duration: 4000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
