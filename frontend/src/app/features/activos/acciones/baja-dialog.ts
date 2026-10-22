import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CrudService } from '@app/core/services/crud.service';
import { AuthService } from '@app/core/services/auth.service';
import { estadoIdPorNombre } from './activo-acciones.util';

export interface BajaDialogData {
  activoId: number;
  codigo: string;
}

@Component({
  selector: 'app-baja-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  template: `
    <div class="p-6 w-full min-w-[320px] max-w-md">
      <h2 class="text-base font-semibold text-slate-900 mb-1">Dar de baja</h2>
      <p class="text-xs text-slate-500 mb-4">Activo: <span class="font-semibold text-slate-700">{{ data.codigo }}</span></p>
      <form [formGroup]="form" (ngSubmit)="guardar()" class="space-y-1">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Motivo de baja</mat-label>
          <textarea matInput formControlName="motivo" rows="4" placeholder="Indica el motivo…"></textarea>
          @if (form.controls.motivo.touched && form.controls.motivo.invalid) {
            <mat-error>El motivo es obligatorio</mat-error>
          }
        </mat-form-field>
        <div class="flex justify-end gap-2 pt-2">
          <button type="button" mat-button (click)="ref.close(false)">Cancelar</button>
          <button type="submit" mat-flat-button color="warn" [disabled]="guardando()">Confirmar baja</button>
        </div>
      </form>
    </div>
  `
})
export class BajaDialogComponent {
  readonly data = inject<BajaDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<BajaDialogComponent>);
  private crud = inject(CrudService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  readonly guardando = signal(false);
  readonly form = this.fb.nonNullable.group({
    motivo: ['', Validators.required]
  });

  async guardar(): Promise<void> {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const userId = this.auth.currentUser()?.id ?? null;
    const motivo = this.form.controls.motivo.value;
    try {
      const estadoId = await estadoIdPorNombre(this.crud, 'Baja');
      await this.crud.actualizar('activos', this.data.activoId, {
        activo: false,
        estado_id: estadoId,
        asignado_a: null
      });
      await this.crud.crear('movimientos', {
        tipo: 'baja',
        activo_id: this.data.activoId,
        motivo,
        created_by: userId
      });
      this.snack.open('Activo dado de baja', 'OK', { duration: 2500 });
      this.ref.close(true);
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al dar de baja', 'Cerrar', { duration: 4000 });
    } finally {
      this.guardando.set(false);
    }
  }
}
