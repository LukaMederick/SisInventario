import { Component, inject, input, OnInit, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CrudService } from '@app/core/services/crud.service';
import { CrudTableComponent, ColumnaDef } from '@app/shared/components/crud-table/crud-table';
import { CrudFormComponent, CampoFormDef } from '@app/shared/components/crud-form/crud-form';
import { ConfirmDialogComponent } from '@app/shared/components/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-catalog-page',
  standalone: true,
  imports: [CrudTableComponent, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="max-w-7xl mx-auto">
      <app-crud-table
        [titulo]="titulo()"
        [columnas]="columnas()"
        [filas]="filas()"
        [cargando]="cargando()"
        (nuevo)="abrirForm()"
        (editar)="abrirForm($event)"
        (eliminar)="confirmarEliminar($event)"
      />
    </div>
  `
})
export class CatalogPageComponent<T extends { id: number }> implements OnInit {
  private crud = inject(CrudService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly tabla = input.required<string>();
  readonly titulo = input.required<string>();
  readonly columnas = input.required<ColumnaDef[]>();
  readonly campos = input.required<CampoFormDef[]>();
  readonly selectQuery = input<string>('*');
  readonly orderCol = input<string>('id');
  readonly valoresDefault = input<Record<string, unknown>>({});
  readonly mapFila = input<(row: any) => any>();
  readonly valoresEdit = input<(fila: any) => Record<string, unknown>>();
  readonly prepararCampos = input<() => Promise<CampoFormDef[]>>();

  readonly filas = signal<T[]>([]);
  readonly cargando = signal(true);

  async ngOnInit(): Promise<void> { await this.cargar(); }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const data = await this.crud.listar<T>(this.tabla(), {
        select: this.selectQuery(),
        orderBy: { column: this.orderCol(), ascending: true }
      });
      const map = this.mapFila();
      this.filas.set(map ? data.map(map) : data);
    } catch {
      this.snack.open('Error al cargar datos', 'Cerrar', { duration: 3000 });
    } finally {
      this.cargando.set(false);
    }
  }

  async abrirForm(fila?: T): Promise<void> {
    const prep = this.prepararCampos();
    const campos = prep ? await prep() : this.campos();
    const extraer = this.valoresEdit();
    const valores = fila
      ? (extraer ? extraer(fila) : fila)
      : this.valoresDefault();

    const ref = this.dialog.open(CrudFormComponent, {
      width: '600px', maxWidth: '95vw',
      data: {
        titulo: fila ? `Editar ${this.titulo()}` : `Nuevo en ${this.titulo()}`,
        campos,
        valores
      }
    });
    ref.afterClosed().subscribe(async (res) => {
      if (!res) return;
      try {
        if ((fila as any)?.id) {
          await this.crud.actualizar(this.tabla(), (fila as any).id, res);
        } else {
          await this.crud.crear(this.tabla(), res);
        }
        this.snack.open('Guardado correctamente', 'OK', { duration: 2500 });
        await this.cargar();
      } catch (e: any) {
        this.snack.open(e?.message ?? 'Error al guardar', 'Cerrar', { duration: 4000 });
      }
    });
  }

  confirmarEliminar(fila: T): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titulo: `Eliminar de ${this.titulo()}`,
        mensaje: '¿Confirmas eliminar este registro?',
        tipo: 'danger'
      }
    }).afterClosed().subscribe(async (ok) => {
      if (!ok) return;
      try {
        await this.crud.eliminar(this.tabla(), (fila as any).id);
        this.snack.open('Eliminado', 'OK', { duration: 2500 });
        await this.cargar();
      } catch (e: any) {
        this.snack.open(e?.message ?? 'Error al eliminar', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
