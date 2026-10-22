import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface CampoFormDef {
  nombre: string;
  label: string;
  tipo: 'text' | 'number' | 'email' | 'textarea' | 'select' | 'boolean' | 'date';
  validators?: any[];
  opciones?: { value: any; label: string }[];
  placeholder?: string;
  columnas?: 1 | 2;
}

export interface CrudFormData {
  titulo: string;
  campos: CampoFormDef[];
  valores?: Record<string, any>;
}

@Component({
  selector: 'app-crud-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './crud-form.html'
})
export class CrudFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  readonly dialogRef = inject(MatDialogRef<CrudFormComponent>);
  readonly data = inject<CrudFormData>(MAT_DIALOG_DATA);

  form!: FormGroup;
  readonly guardando = signal<boolean>(false);

  ngOnInit(): void {
    const controls: Record<string, any> = {};
    for (const campo of this.data.campos) {
      const valor = this.data.valores?.[campo.nombre] ?? (campo.tipo === 'boolean' ? false : '');
      controls[campo.nombre] = [valor, campo.validators ?? []];
    }
    this.form = this.fb.group(controls);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.getRawValue());
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  hasError(campo: string, error: string): boolean {
    const ctrl = this.form.get(campo);
    return !!(ctrl?.touched && ctrl.hasError(error));
  }
}
