import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { CrudService } from '@app/core/services/crud.service';
import { CrudTableComponent, ColumnaDef } from '@app/shared/components/crud-table/crud-table';
import { ConfirmDialogComponent } from '@app/shared/components/confirm-dialog/confirm-dialog';
import { ActivoFormComponent } from './activo-form';
import { QrDialogComponent } from './qr-dialog';

const SELECT_JOIN = `
  *,
  modelos(nombre, categoria_id, marcas(nombre), categorias(nombre)),
  almacenes(nombre),
  estados_equipo(nombre, color),
  proveedores(nombre)
`;

const COLUMNAS: ColumnaDef[] = [
  { key: 'codigo_activo', label: 'Código' },
  { key: 'numero_serie', label: 'N° Serie' },
  { key: '_modelo', label: 'Modelo' },
  { key: '_almacen', label: 'Almacén' },
  { key: '_estado', label: 'Estado', type: 'color', colorKey: '_estado_color' },
  { key: 'condicion', label: 'Condición' },
  { key: 'activo', label: 'Activo', type: 'boolean' }
];

interface Opt { value: any; label: string }

@Component({
  selector: 'app-activos',
  standalone: true,
  imports: [
    FormsModule, CrudTableComponent, MatDialogModule, MatSnackBarModule,
    MatFormFieldModule, MatSelectModule, MatInputModule, MatButtonModule
  ],
  template: `
    <div class="max-w-7xl mx-auto space-y-4">
      <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <mat-form-field appearance="outline" class="w-full !text-sm">
            <mat-label>Almacén</mat-label>
            <mat-select [(ngModel)]="filtroAlmacen" (ngModelChange)="cargar()">
              <mat-option [value]="null">Todos</mat-option>
              @for (op of almacenesOpts(); track op.value) {
                <mat-option [value]="op.value">{{ op.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !text-sm">
            <mat-label>Categoría</mat-label>
            <mat-select [(ngModel)]="filtroCategoria" (ngModelChange)="cargar()">
              <mat-option [value]="null">Todas</mat-option>
              @for (op of categoriasOpts(); track op.value) {
                <mat-option [value]="op.value">{{ op.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !text-sm">
            <mat-label>Estado</mat-label>
            <mat-select [(ngModel)]="filtroEstado" (ngModelChange)="cargar()">
              <mat-option [value]="null">Todos</mat-option>
              @for (op of estadosOpts(); track op.value) {
                <mat-option [value]="op.value">{{ op.label }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="w-full !text-sm">
            <mat-label>Búsqueda</mat-label>
            <input matInput [(ngModel)]="filtroBusqueda" (ngModelChange)="aplicarBusqueda()"
              placeholder="Código o serie…" />
          </mat-form-field>
        </div>
      </div>

      <app-crud-table
        titulo="Activos (Equipos)"
        [columnas]="columnas"
        [filas]="filas()"
        [cargando]="cargando()"
        [mostrarDetalle]="true"
        [mostrarQr]="true"
        (nuevo)="abrirForm()"
        (editar)="abrirForm($event)"
        (eliminar)="confirmarEliminar($event)"
        (verDetalle)="irDetalle($event)"
        (verQr)="abrirQr($event)"
      />
    </div>
  `
})
export class ActivosComponent implements OnInit {
  private crud = inject(CrudService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  readonly columnas = COLUMNAS;
  readonly filas = signal<any[]>([]);
  readonly cargando = signal(true);
  readonly almacenesOpts = signal<Opt[]>([]);
  readonly categoriasOpts = signal<Opt[]>([]);
  readonly estadosOpts = signal<Opt[]>([]);

  private todos: any[] = [];
  filtroAlmacen: number | null = null;
  filtroCategoria: number | null = null;
  filtroEstado: number | null = null;
  filtroBusqueda = '';

  async ngOnInit(): Promise<void> {
    const [alms, cats, ests] = await Promise.all([
      this.crud.listar<any>('almacenes', { orderBy: { column: 'nombre' } }),
      this.crud.listar<any>('categorias', { orderBy: { column: 'nombre' } }),
      this.crud.listar<any>('estados_equipo', { orderBy: { column: 'nombre' } })
    ]);
    this.almacenesOpts.set(alms.map(a => ({ value: a.id, label: a.nombre })));
    this.categoriasOpts.set(cats.map(c => ({ value: c.id, label: c.nombre })));
    this.estadosOpts.set(ests.map(e => ({ value: e.id, label: e.nombre })));
    await this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    try {
      const filters: Record<string, any> = {};
      if (this.filtroAlmacen != null) filters['almacen_id'] = this.filtroAlmacen;
      if (this.filtroEstado != null) filters['estado_id'] = this.filtroEstado;

      const data = await this.crud.listar<any>('activos', {
        select: SELECT_JOIN,
        filters,
        orderBy: { column: 'codigo_activo' }
      });

      let mapped = data.map((a: any) => ({
        ...a,
        _modelo: a.modelos?.nombre ?? '—',
        _almacen: a.almacenes?.nombre ?? '—',
        _estado: a.estados_equipo?.nombre ?? '—',
        _estado_color: a.estados_equipo?.color ?? '#3b82f6',
        _categoria_id: a.modelos?.categoria_id ?? null
      }));

      if (this.filtroCategoria != null) {
        mapped = mapped.filter(a => a._categoria_id === this.filtroCategoria);
      }
      this.todos = mapped;
      this.aplicarBusqueda();
    } catch (e: any) {
      this.snack.open(e?.message ?? 'Error al cargar activos', 'Cerrar', { duration: 4000 });
    } finally {
      this.cargando.set(false);
    }
  }

  aplicarBusqueda(): void {
    const q = this.filtroBusqueda.trim().toLowerCase();
    if (!q) {
      this.filas.set(this.todos);
      return;
    }
    this.filas.set(this.todos.filter(a =>
      String(a.codigo_activo ?? '').toLowerCase().includes(q) ||
      String(a.numero_serie ?? '').toLowerCase().includes(q) ||
      String(a._modelo ?? '').toLowerCase().includes(q)
    ));
  }

  abrirForm(fila?: any): void {
    this.dialog.open(ActivoFormComponent, {
      width: '720px', maxWidth: '95vw',
      data: { activo: fila ?? null }
    }).afterClosed().subscribe(async (res) => {
      if (!res) return;
      try {
        if (fila?.id) {
          await this.crud.actualizar('activos', fila.id, res);
          this.snack.open('Activo actualizado', 'OK', { duration: 2500 });
        } else {
          await this.crud.crear('activos', res);
          this.snack.open('Activo creado', 'OK', { duration: 2500 });
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
        titulo: 'Eliminar Activo',
        mensaje: `¿Eliminar "${fila.codigo_activo}"? Esta acción no se puede deshacer.`,
        tipo: 'danger'
      }
    }).afterClosed().subscribe(async (ok) => {
      if (!ok) return;
      try {
        await this.crud.eliminar('activos', fila.id);
        this.snack.open('Activo eliminado', 'OK', { duration: 2500 });
        await this.cargar();
      } catch (e: any) {
        this.snack.open(e?.message ?? 'Error al eliminar', 'Cerrar', { duration: 4000 });
      }
    });
  }

  irDetalle(fila: any): void {
    this.router.navigate(['/activos', fila.id]);
  }

  abrirQr(fila: any): void {
    this.dialog.open(QrDialogComponent, {
      width: '380px',
      data: { id: fila.id, codigo_activo: fila.codigo_activo }
    });
  }
}
