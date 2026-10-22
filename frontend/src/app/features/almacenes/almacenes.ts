import { Component, inject, OnInit, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Validators } from '@angular/forms';
import { CrudService } from '@app/core/services/crud.service';
import { Almacen } from '@app/core/models/models';
import { CrudTableComponent, ColumnaDef } from '@app/shared/components/crud-table/crud-table';
import { CrudFormComponent, CampoFormDef } from '@app/shared/components/crud-form/crud-form';
import { ConfirmDialogComponent } from '@app/shared/components/confirm-dialog/confirm-dialog';

const CAMPOS_ALMACEN: CampoFormDef[] = [
  { nombre: 'codigo', label: 'Código', tipo: 'text', validators: [Validators.required], placeholder: 'ALM-001', columnas: 1 },
  { nombre: 'nombre', label: 'Nombre', tipo: 'text', validators: [Validators.required], placeholder: 'Almacén Principal', columnas: 1 },
  { nombre: 'ciudad', label: 'Ciudad', tipo: 'text', placeholder: 'Lima', columnas: 1 },
  { nombre: 'telefono', label: 'Teléfono', tipo: 'text', placeholder: '01-4567890', columnas: 1 },
  { nombre: 'direccion', label: 'Dirección', tipo: 'textarea', placeholder: 'Av. Principal 123', columnas: 2 },
  { nombre: 'activo', label: 'Almacén activo', tipo: 'boolean', columnas: 2 }
];

const COLUMNAS: ColumnaDef[] = [
  { key: 'codigo', label: 'Código' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'ciudad', label: 'Ciudad' },
  { key: 'telefono', label: 'Teléfono' },
  { key: 'activo', label: 'Estado', type: 'boolean' }
];

@Component({
  selector: 'app-almacenes',
  standalone: true,
  imports: [CrudTableComponent, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="max-w-7xl mx-auto">
      <app-crud-table
        titulo="Almacenes"
        [columnas]="columnas"
        [filas]="almacenes()"
        [cargando]="cargando()"
        (nuevo)="abrirFormulario()"
        (editar)="abrirFormulario($event)"
        (eliminar)="confirmarEliminar($event)"
      />
    </div>
  `
})
export class AlmacenesComponent implements OnInit {
  private crud = inject(CrudService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly almacenes = signal<Almacen[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly columnas = COLUMNAS;

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  private async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const data = await this.crud.listar<Almacen>('almacenes', {
        orderBy: { column: 'nombre', ascending: true }
      });
      this.almacenes.set(data);
    } catch {
      this.snack.open('Error al cargar almacenes', 'Cerrar', { duration: 3000 });
    } finally {
      this.cargando.set(false);
    }
  }

  abrirFormulario(almacen?: Almacen): void {
    const ref = this.dialog.open(CrudFormComponent, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'rounded-dialog',
      data: {
        titulo: almacen ? 'Editar Almacén' : 'Nuevo Almacén',
        campos: CAMPOS_ALMACEN,
        valores: almacen
      }
    });

    ref.afterClosed().subscribe(async (resultado) => {
      if (!resultado) return;
      try {
        if (almacen?.id) {
          await this.crud.actualizar<Almacen>('almacenes', almacen.id, resultado);
          this.snack.open('Almacén actualizado', 'OK', { duration: 2500 });
        } else {
          await this.crud.crear<Almacen>('almacenes', resultado);
          this.snack.open('Almacén creado', 'OK', { duration: 2500 });
        }
        await this.cargar();
      } catch (err: any) {
        this.snack.open(err?.message ?? 'Error al guardar', 'Cerrar', { duration: 4000 });
      }
    });
  }

  confirmarEliminar(almacen: Almacen): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      maxWidth: '95vw',
      data: {
        titulo: 'Eliminar Almacén',
        mensaje: `¿Seguro que deseas eliminar "${almacen.nombre}"? Esta acción no se puede deshacer.`,
        tipo: 'danger'
      }
    });

    ref.afterClosed().subscribe(async (confirmado) => {
      if (!confirmado) return;
      try {
        await this.crud.eliminar('almacenes', almacen.id);
        this.snack.open('Almacén eliminado', 'OK', { duration: 2500 });
        await this.cargar();
      } catch (err: any) {
        this.snack.open(err?.message ?? 'Error al eliminar', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
