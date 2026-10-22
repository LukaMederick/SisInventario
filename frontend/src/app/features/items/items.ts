import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { Validators } from '@angular/forms';
import { CrudService } from '@app/core/services/crud.service';
import { CrudTableComponent, ColumnaDef } from '@app/shared/components/crud-table/crud-table';
import { CrudFormComponent, CampoFormDef } from '@app/shared/components/crud-form/crud-form';
import { ConfirmDialogComponent } from '@app/shared/components/confirm-dialog/confirm-dialog';

const COLUMNAS: ColumnaDef[] = [
  { key: 'sku', label: 'SKU' },
  { key: 'nombre', label: 'Nombre' },
  { key: '_categoria', label: 'Categoría' },
  { key: '_marca', label: 'Marca' },
  { key: 'unidad', label: 'Unidad' },
  { key: 'stock_minimo', label: 'Stock Mín.' },
  { key: 'activo', label: 'Estado', type: 'boolean' }
];

interface Opt { value: any; label: string }

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [
    FormsModule, CrudTableComponent, MatDialogModule, MatSnackBarModule,
    MatFormFieldModule, MatSelectModule, MatInputModule
  ],
  template: `
    <div class="max-w-7xl mx-auto space-y-4">
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <mat-form-field appearance="outline" class="w-full !text-sm">
            <mat-label>Categoría</mat-label>
            <mat-select [(ngModel)]="filtroCategoria" (ngModelChange)="aplicarFiltros()">
              <mat-option [value]="null">Todas</mat-option>
              @for (op of categoriasOpts(); track op.value) {
                <mat-option [value]="op.value">{{ op.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !text-sm">
            <mat-label>Marca</mat-label>
            <mat-select [(ngModel)]="filtroMarca" (ngModelChange)="aplicarFiltros()">
              <mat-option [value]="null">Todas</mat-option>
              @for (op of marcasOpts(); track op.value) {
                <mat-option [value]="op.value">{{ op.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !text-sm">
            <mat-label>Búsqueda</mat-label>
            <input matInput [(ngModel)]="filtroBusqueda" (ngModelChange)="aplicarFiltros()"
              placeholder="SKU o nombre…" />
          </mat-form-field>
        </div>
      </div>

      <app-crud-table
        titulo="Ítems (Insumos)"
        [columnas]="columnas"
        [filas]="filas()"
        [cargando]="cargando()"
        (nuevo)="abrirForm()"
        (editar)="abrirForm($event)"
        (eliminar)="confirmarEliminar($event)"
      />
    </div>
  `
})
export class ItemsComponent implements OnInit {
  private crud = inject(CrudService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  readonly columnas = COLUMNAS;
  readonly filas = signal<any[]>([]);
  readonly cargando = signal(true);

  readonly categoriasOpts = signal<Opt[]>([]);
  readonly marcasOpts = signal<Opt[]>([]);

  filtroCategoria: number | null = null;
  filtroMarca: number | null = null;
  filtroBusqueda = '';

  private todos: any[] = [];

  async ngOnInit(): Promise<void> {
    await this.cargarCatalogos();
    await this.cargar();
  }

  async cargarCatalogos(): Promise<void> {
    const [cats, marcas] = await Promise.all([
      this.crud.listar<any>('categorias', { orderBy: { column: 'nombre' } }),
      this.crud.listar<any>('marcas', { orderBy: { column: 'nombre' } })
    ]);
    this.categoriasOpts.set(cats.map(c => ({ value: c.id, label: c.nombre })));
    this.marcasOpts.set(marcas.map(m => ({ value: m.id, label: m.nombre })));
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const data = await this.crud.listar<any>('items', {
        select: '*, categorias(nombre), marcas(nombre)',
        orderBy: { column: 'nombre', ascending: true }
      });
      this.todos = data.map(it => ({
        ...it,
        _categoria: it.categorias?.nombre ?? '—',
        _marca: it.marcas?.nombre ?? '—'
      }));
      this.aplicarFiltros();
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al cargar ítems', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  aplicarFiltros(): void {
    let res = this.todos;
    if (this.filtroCategoria !== null) {
      res = res.filter(it => it.categoria_id === this.filtroCategoria);
    }
    if (this.filtroMarca !== null) {
      res = res.filter(it => it.marca_id === this.filtroMarca);
    }
    const q = this.filtroBusqueda.trim().toLowerCase();
    if (q) {
      res = res.filter(it =>
        String(it.sku ?? '').toLowerCase().includes(q) ||
        String(it.nombre ?? '').toLowerCase().includes(q) ||
        String(it._marca ?? '').toLowerCase().includes(q)
      );
    }
    this.filas.set(res);
  }

  abrirForm(fila?: any): void {
    const campos: CampoFormDef[] = [
      { nombre: 'sku', label: 'SKU', tipo: 'text', validators: [Validators.required], placeholder: 'TON-001', columnas: 1 },
      { nombre: 'nombre', label: 'Nombre', tipo: 'text', validators: [Validators.required], placeholder: 'Tóner HP 26A', columnas: 1 },
      { nombre: 'categoria_id', label: 'Categoría', tipo: 'select', validators: [Validators.required], opciones: this.categoriasOpts(), columnas: 1 },
      { nombre: 'marca_id', label: 'Marca', tipo: 'select', opciones: this.marcasOpts(), columnas: 1 },
      { nombre: 'unidad', label: 'Unidad de medida', tipo: 'text', validators: [Validators.required], placeholder: 'unidad', columnas: 1 },
      { nombre: 'stock_minimo', label: 'Stock mínimo', tipo: 'number', validators: [Validators.required, Validators.min(0)], columnas: 1 },
      { nombre: 'descripcion', label: 'Descripción', tipo: 'textarea', placeholder: 'Detalles del insumo', columnas: 2 },
      { nombre: 'activo', label: 'Ítem activo', tipo: 'boolean', columnas: 2 }
    ];

    const valores = fila ? {
      sku: fila.sku,
      nombre: fila.nombre,
      categoria_id: fila.categoria_id,
      marca_id: fila.marca_id,
      unidad: fila.unidad ?? 'unidad',
      stock_minimo: fila.stock_minimo ?? 0,
      descripcion: fila.descripcion ?? '',
      activo: fila.activo ?? true
    } : {
      unidad: 'unidad',
      stock_minimo: 5,
      activo: true
    };

    this.dialog.open(CrudFormComponent, {
      width: '640px', maxWidth: '95vw',
      data: {
        titulo: fila ? 'Editar Ítem' : 'Nuevo Ítem',
        campos,
        valores
      }
    }).afterClosed().subscribe(async (res) => {
      if (!res) return;
      try {
        if (fila?.id) {
          await this.crud.actualizar('items', fila.id, res);
          this.snack.open('Ítem actualizado', 'OK', { duration: 2500 });
        } else {
          await this.crud.crear('items', res);
          this.snack.open('Ítem creado', 'OK', { duration: 2500 });
        }
        await this.cargar();
      } catch (e: any) {
        this.snack.open(e?.message ?? 'Error al guardar', 'Cerrar', { duration: 4000 });
      }
    });
  }

  confirmarEliminar(fila: any): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titulo: 'Eliminar Ítem',
        mensaje: `¿Eliminar "${fila.nombre}" (${fila.sku})?`,
        tipo: 'danger'
      }
    }).afterClosed().subscribe(async (ok) => {
      if (!ok) return;
      try {
        await this.crud.eliminar('items', fila.id);
        this.snack.open('Ítem eliminado', 'OK', { duration: 2500 });
        await this.cargar();
      } catch (e: any) {
        this.snack.open(e?.message ?? 'Error al eliminar', 'Cerrar', { duration: 4000 });
      }
    });
  }
}
